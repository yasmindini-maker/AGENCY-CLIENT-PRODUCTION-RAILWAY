import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.APP_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Enhanced Helmet configuration
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }),
);

// Enhanced CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-test-auth", "x-test-actor"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400, // 24 hours
  }),
);

// Enhanced rate limiting with different limits for different routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.path === "/api/healthz",
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // Stricter limit for auth endpoints
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later" },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // Limit file uploads
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many file uploads, please try again later" },
});

app.use(generalLimiter);
app.use("/api/account/invites", authLimiter);
app.use("/api/files/deliverables", uploadLimiter);

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Enhanced body parsing with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Request validation middleware
app.use((req, res, next) => {
  // Validate content type for POST/PUT/PATCH requests
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("json")) {
    // Allow multipart/form-data for file uploads
    if (!req.is("multipart/form-data")) {
      res.status(415).json({ error: "Unsupported Media Type" });
      return;
    }
  }
  next();
});

app.use("/api", router);

// Enhanced error handling
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  
  if (message === "Origin not allowed by CORS") {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  // Log error for debugging
  logger.error({ error }, "Request error");

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ error: "Internal server error" });
  } else {
    res.status(500).json({ error: message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
