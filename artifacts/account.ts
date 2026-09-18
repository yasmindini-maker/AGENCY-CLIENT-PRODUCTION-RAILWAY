import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  agenciesTable,
  clientsTable,
  db,
  invitesTable,
  membershipsTable,
  portalUsersTable,
  projectsTable,
} from "@workspace/db";
import { actorOf, requirePortalUser, requireStaff } from "../lib/auth";
import { canManageTeam, type PortalRole } from "../lib/access";
import { acceptInviteToken, createInviteToken, hashInviteToken } from "../lib/identity";
import { sendClerkMagicInvite } from "../lib/clerk-invite";
import { getProjectInAgency } from "../lib/portal-store";

const router: IRouter = Router();
router.use(requirePortalUser);

const inviteBody = z.object({
  email: z.string().email(),
  role: z.enum(["agency_admin", "agency_member", "client"]).optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

const clientBody = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  company: z.string().trim().min(1).max(160),
});

const agencyBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  website: z.string().trim().max(200).optional(),
  supportEmail: z.string().email().optional(),
  intro: z.string().trim().max(500).optional(),
  brandName: z.string().trim().max(80).optional(),
  showPoweredBy: z.boolean().optional(),
});

function initialsFromName(name: string): string {
  return name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
}

router.get("/me", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, actor.agencyId)).limit(1);
  res.json({
    user: {
      id: actor.userId,
      email: actor.email,
      name: actor.name,
      role: actor.role,
      clientId: actor.clientId ?? null,
      projectIds: actor.projectIds,
    },
    agency: agency
      ? {
          id: agency.id,
          name: agency.name,
          initials: agency.initials,
          website: agency.website,
          supportEmail: agency.supportEmail,
          intro: agency.intro,
          brandName: agency.brandName || agency.name,
          showPoweredBy: agency.showPoweredBy,
        }
      : null,
  });
});

router.patch("/agency", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  if (!canManageTeam(actor)) {
    res.status(403).json({ error: "Only agency admins can update studio settings" });
    return;
  }
  const parsed = agencyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [agency] = await db
    .update(agenciesTable)
    .set({
      ...parsed.data,
      initials: parsed.data.name ? initialsFromName(parsed.data.name) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(agenciesTable.id, actor.agencyId))
    .returning();
  res.json(agency);
});

router.post("/clients", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = clientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db
    .insert(clientsTable)
    .values({
      agencyId: actor.agencyId,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company,
      initials: initialsFromName(parsed.data.company || parsed.data.name),
    })
    .returning();
  res.status(201).json({ ...client, projectCount: 0 });
});

router.get("/team", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const rows = await db
    .select({
      id: membershipsTable.id,
      role: membershipsTable.role,
      email: portalUsersTable.email,
      name: portalUsersTable.name,
    })
    .from(membershipsTable)
    .innerJoin(portalUsersTable, eq(membershipsTable.userId, portalUsersTable.id))
    .where(eq(membershipsTable.agencyId, actor.agencyId));
  res.json(rows);
});

async function createInvite(options: {
  actor: ReturnType<typeof actorOf>;
  email: string;
  role: PortalRole;
  clientId?: string;
  projectId?: string;
}) {
  const token = createInviteToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const [invite] = await db
    .insert(invitesTable)
    .values({
      agencyId: options.actor.agencyId,
      email: options.email.toLowerCase(),
      role: options.role,
      clientId: options.clientId,
      projectId: options.projectId,
      tokenHash: hashInviteToken(token),
      expiresAt,
      createdByUserId: options.actor.userId,
    })
    .returning();
  const invitePath = `/accept-invite?token=${token}`;
  const redirectUrl = `${appUrl()}${invitePath}`;
  const clerkResult = await sendClerkMagicInvite({
    email: options.email.toLowerCase(),
    redirectUrl,
    role: options.role,
    agencyId: options.actor.agencyId,
    clientId: options.clientId,
    projectId: options.projectId,
  });
  
  // Clerk email is best-effort; the copyable magic link still works even if email fails
  return { 
    invite, 
    token, 
    url: redirectUrl,
    emailSent: clerkResult.success,
    emailError: clerkResult.error
  };
}

router.post("/invites", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = inviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const role = parsed.data.role ?? "client";
  let projectId = parsed.data.projectId;
  if (role !== "client" && !canManageTeam(actor)) {
    res.status(403).json({ error: "Only agency admins can invite team members" });
    return;
  }
  if (role === "client" && !parsed.data.clientId) {
    res.status(400).json({ error: "clientId is required for client magic-link invites" });
    return;
  }
  if (parsed.data.clientId) {
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.agencyId, actor.agencyId)))
      .limit(1);
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
  }
  if (projectId) {
    const project = await getProjectInAgency(actor, projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (parsed.data.clientId && project.clientId !== parsed.data.clientId) {
      res.status(400).json({ error: "Project does not belong to this client" });
      return;
    }
  } else if (role === "client" && parsed.data.clientId) {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.agencyId, actor.agencyId), eq(projectsTable.clientId, parsed.data.clientId)))
      .limit(1);
    if (project) projectId = project.id;
  }
  const created = await createInvite({
    actor,
    email: parsed.data.email,
    role,
    clientId: parsed.data.clientId,
    projectId,
  });
  res.status(201).json({
    id: created.invite.id,
    email: created.invite.email,
    role: created.invite.role,
    expiresAt: created.invite.expiresAt.toISOString(),
    url: created.url,
    emailSent: created.emailSent,
    emailError: created.emailError,
  });
});

router.post("/invites/accept", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = z.object({ token: z.string().min(16) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const accepted = await acceptInviteToken(
    { clerkUserId: actor.clerkUserId, email: actor.email, name: actor.name },
    parsed.data.token,
  );
  if (!accepted) {
    res.status(400).json({ error: "Invite is invalid, expired, or was issued to a different email" });
    return;
  }
  res.json({
    role: accepted.role,
    projectIds: accepted.projectIds,
    agencyId: accepted.agencyId,
  });
});

export default router;
