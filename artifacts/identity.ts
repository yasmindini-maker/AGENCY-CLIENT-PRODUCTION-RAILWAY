import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  agenciesTable,
  db,
  invitesTable,
  membershipsTable,
  portalUsersTable,
  projectAccessTable,
  projectsTable,
} from "@workspace/db";
import type { PortalActor, PortalRole } from "./access";

export type ClerkIdentity = {
  clerkUserId: string;
  email: string;
  name: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AG";
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

async function loadActor(userId: string, membershipId: string): Promise<PortalActor | undefined> {
  const [row] = await db
    .select({
      userId: portalUsersTable.id,
      clerkUserId: portalUsersTable.clerkUserId,
      email: portalUsersTable.email,
      name: portalUsersTable.name,
      membershipId: membershipsTable.id,
      agencyId: membershipsTable.agencyId,
      role: membershipsTable.role,
      clientId: membershipsTable.clientId,
    })
    .from(membershipsTable)
    .innerJoin(portalUsersTable, eq(membershipsTable.userId, portalUsersTable.id))
    .where(and(eq(portalUsersTable.id, userId), eq(membershipsTable.id, membershipId)))
    .limit(1);

  if (!row) return undefined;

  const access = await db
    .select({ projectId: projectAccessTable.projectId })
    .from(projectAccessTable)
    .where(eq(projectAccessTable.membershipId, row.membershipId));

  return {
    userId: row.userId,
    clerkUserId: row.clerkUserId,
    email: row.email,
    name: row.name,
    membershipId: row.membershipId,
    agencyId: row.agencyId,
    role: row.role as PortalRole,
    clientId: row.clientId ?? undefined,
    projectIds: access.map((item) => item.projectId),
  };
}

async function ensureUser(identity: ClerkIdentity) {
  const existing = await db
    .select()
    .from(portalUsersTable)
    .where(eq(portalUsersTable.clerkUserId, identity.clerkUserId))
    .limit(1);

  if (existing[0]) {
    if (existing[0].email !== identity.email || existing[0].name !== identity.name) {
      const [updated] = await db
        .update(portalUsersTable)
        .set({ email: identity.email, name: identity.name, updatedAt: new Date() })
        .where(eq(portalUsersTable.id, existing[0].id))
        .returning();
      return updated;
    }
    return existing[0];
  }

  const [created] = await db
    .insert(portalUsersTable)
    .values({
      clerkUserId: identity.clerkUserId,
      email: identity.email,
      name: identity.name,
    })
    .returning();
  return created;
}

async function grantProjectAccess(membershipId: string, projectId: string | null | undefined) {
  if (!projectId) return;
  const [existingAccess] = await db
    .select({ id: projectAccessTable.id })
    .from(projectAccessTable)
    .where(and(eq(projectAccessTable.membershipId, membershipId), eq(projectAccessTable.projectId, projectId)))
    .limit(1);
  if (!existingAccess) {
    await db.insert(projectAccessTable).values({ membershipId, projectId });
  }
}

async function acceptOpenInvites(userId: string, email: string) {
  const now = new Date();
  const invites = await db
    .select()
    .from(invitesTable)
    .where(
      and(
        eq(invitesTable.email, email.toLowerCase()),
        isNull(invitesTable.acceptedAt),
        gt(invitesTable.expiresAt, now),
      ),
    );

  let lastMembershipId: string | undefined;
  for (const invite of invites) {
    const existing = await db
      .select()
      .from(membershipsTable)
      .where(and(eq(membershipsTable.userId, userId), eq(membershipsTable.agencyId, invite.agencyId)))
      .limit(1);

    const membership =
      existing[0] ??
      (
        await db
          .insert(membershipsTable)
          .values({
            userId,
            agencyId: invite.agencyId,
            role: invite.role,
            clientId: invite.clientId,
          })
          .returning()
      )[0];

    await grantProjectAccess(membership.id, invite.projectId);
    await db
      .update(invitesTable)
      .set({ acceptedAt: now, updatedAt: now })
      .where(eq(invitesTable.id, invite.id));
    lastMembershipId = membership.id;
  }
  return lastMembershipId;
}

async function bootstrapFirstAdmin(userId: string, identity: ClerkIdentity) {
  const [existingMembership] = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId))
    .limit(1);
  if (existingMembership) return existingMembership.id;

  const [anyMembership] = await db.select({ id: membershipsTable.id }).from(membershipsTable).limit(1);
  if (anyMembership) return undefined;

  const [agency] = await db.select().from(agenciesTable).limit(1);
  const agencyRow =
    agency ??
    (
      await db
        .insert(agenciesTable)
        .values({
          name: identity.name || "Studio",
          initials: initialsFromName(identity.name || "Studio"),
          brandName: identity.name || "Studio",
          supportEmail: identity.email,
        })
        .returning()
    )[0];

  const [membership] = await db
    .insert(membershipsTable)
    .values({
      userId,
      agencyId: agencyRow.id,
      role: "agency_admin",
    })
    .returning();
  return membership.id;
}

export async function resolvePortalActor(identity: ClerkIdentity): Promise<PortalActor | undefined> {
  const user = await ensureUser(identity);
  const invitedMembershipId = await acceptOpenInvites(user.id, identity.email);
  const membershipId = invitedMembershipId ?? (await bootstrapFirstAdmin(user.id, identity));
  if (!membershipId) {
    const [membership] = await db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, user.id))
      .limit(1);
    if (!membership) return undefined;
    return loadActor(user.id, membership.id);
  }
  return loadActor(user.id, membershipId);
}

export function hashInviteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function acceptInviteToken(identity: ClerkIdentity, token: string): Promise<PortalActor | undefined> {
  const tokenHash = hashInviteToken(token);
  const [invite] = await db
    .select()
    .from(invitesTable)
    .where(and(eq(invitesTable.tokenHash, tokenHash), isNull(invitesTable.acceptedAt)))
    .limit(1);

  if (!invite || invite.expiresAt.getTime() < Date.now()) return undefined;
  if (invite.email !== identity.email.toLowerCase()) return undefined;

  const user = await ensureUser(identity);
  const [existing] = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.userId, user.id), eq(membershipsTable.agencyId, invite.agencyId)))
    .limit(1);

  const membership =
    existing ??
    (
      await db
        .insert(membershipsTable)
        .values({
          userId: user.id,
          agencyId: invite.agencyId,
          role: invite.role,
          clientId: invite.clientId,
        })
        .returning()
    )[0];

  await grantProjectAccess(membership.id, invite.projectId);
  await db
    .update(invitesTable)
    .set({ acceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(invitesTable.id, invite.id));

  return loadActor(user.id, membership.id);
}

export async function listAccessibleProjectRows(actor: PortalActor) {
  if (actor.role !== "client") {
    return db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.agencyId, actor.agencyId));
  }
  if (!actor.projectIds.length) return [];
  return actor.projectIds.map((id) => ({ id }));
}
