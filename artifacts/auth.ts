import type { NextFunction, Request, Response } from "express";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { canMutateWorkspace, type PortalActor } from "./access";
import type { ClerkIdentity } from "./identity";
import { resolvePortalActor } from "./identity";

declare global {
  namespace Express {
    interface Request {
      portal?: PortalActor;
    }
  }
}

function readBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
}

function parseTestActor(req: Request): ClerkIdentity | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const secret = process.env.TEST_AUTH_SECRET;
  if (!secret || req.headers["x-test-auth"] !== secret) return undefined;
  const raw = req.headers["x-test-actor"];
  if (typeof raw !== "string") return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<ClerkIdentity>;
    if (!parsed.clerkUserId || !parsed.email) return undefined;
    return {
      clerkUserId: parsed.clerkUserId,
      email: parsed.email.toLowerCase(),
      name: parsed.name || parsed.email,
    };
  } catch {
    return undefined;
  }
}

async function identityFromClerk(token: string): Promise<ClerkIdentity> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw Object.assign(new Error("Clerk is not configured"), { status: 500 });
  }
  const payload = await verifyToken(token, { secretKey });
  const clerkUserId = payload.sub;
  if (!clerkUserId) {
    throw Object.assign(new Error("Invalid session"), { status: 401 });
  }

  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(clerkUserId);
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw Object.assign(new Error("User is missing an email address"), { status: 401 });
  }
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email;
  return { clerkUserId, email: email.toLowerCase(), name };
}

export async function requirePortalUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const testIdentity = parseTestActor(req);
    const token = readBearer(req);
    const identity = testIdentity ?? (token ? await identityFromClerk(token) : undefined);
    if (!identity) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const actor = await resolvePortalActor(identity);
    if (!actor) {
      res.status(403).json({ error: "You do not have access to this workspace. Ask an agency admin for an invite." });
      return;
    }
    req.portal = actor;
    next();
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 401;
    res.status(status === 500 ? 500 : 401).json({ error: "Authentication failed" });
  }
}

export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  if (!req.portal || !canMutateWorkspace(req.portal)) {
    res.status(403).json({ error: "This action is limited to agency team members" });
    return;
  }
  next();
}

export function actorOf(req: Request): PortalActor {
  if (!req.portal) {
    throw new Error("Portal actor missing");
  }
  return req.portal;
}
