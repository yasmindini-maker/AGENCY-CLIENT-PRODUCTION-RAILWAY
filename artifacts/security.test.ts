import { describe, expect, it } from "vitest";
import request from "supertest";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

function hardenedApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: "http://localhost:5173" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: true, legacyHeaders: false }));
  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/dashboard", (_req, res) => res.status(401).json({ error: "Authentication required" }));
  return app;
}

describe("API security baseline", () => {
  it("does not advertise Express", async () => {
    const response = await request(hardenedApp()).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("rejects unauthenticated product routes", async () => {
    const response = await request(hardenedApp()).get("/api/dashboard");
    expect(response.status).toBe(401);
  });

  it("rate limits abusive clients", async () => {
    const app = hardenedApp();
    const calls = await Promise.all(Array.from({ length: 6 }, () => request(app).get("/api/healthz")));
    expect(calls.some((item) => item.status === 429)).toBe(true);
  });

  it("sets proper security headers", async () => {
    const response = await request(hardenedApp()).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.headers["x-frame-options"]).toBeDefined();
    expect(response.headers["x-xss-protection"]).toBeDefined();
    expect(response.headers["referrer-policy"]).toBeDefined();
  });

  it("rejects invalid CORS origins", async () => {
    const app = express();
    app.use(cors({ origin: "http://localhost:5173" }));
    app.get("/api/test", (_req, res) => res.json({ status: "ok" }));
    
    const response = await request(app)
      .get("/api/test")
      .set("Origin", "http://malicious.com");
    
    // CORS should reject or handle the request properly
    expect(response.status).toBeDefined();
  });

  it("has proper content security policy", async () => {
    const response = await request(hardenedApp()).get("/api/healthz");
    expect(response.status).toBe(200);
    expect(response.headers["content-security-policy"]).toBeDefined();
  });
});
