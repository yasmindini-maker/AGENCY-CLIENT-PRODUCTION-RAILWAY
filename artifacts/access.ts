export const PORTAL_ROLES = ["agency_admin", "agency_member", "client"] as const;

export type PortalRole = (typeof PORTAL_ROLES)[number];

export type PortalActor = {
  userId: string;
  clerkUserId: string;
  email: string;
  name: string;
  membershipId: string;
  agencyId: string;
  role: PortalRole;
  clientId?: string;
  projectIds: string[];
};

export type ProjectScope = {
  id: string;
  agencyId: string;
  clientId: string;
};

export function isAgencyStaff(actor: PortalActor): boolean {
  return actor.role === "agency_admin" || actor.role === "agency_member";
}

export function canManageTeam(actor: PortalActor): boolean {
  return actor.role === "agency_admin";
}

export function canInviteClients(actor: PortalActor): boolean {
  return isAgencyStaff(actor);
}

export function canMutateWorkspace(actor: PortalActor): boolean {
  return isAgencyStaff(actor);
}

export function canAccessProject(actor: PortalActor, project: ProjectScope | undefined): boolean {
  if (!project) return false;
  if (project.agencyId !== actor.agencyId) return false;
  if (actor.role === "client") return actor.projectIds.includes(project.id);
  return true;
}

export function scopedProjectIds(actor: PortalActor, allIds: string[]): string[] {
  if (actor.role !== "client") return allIds;
  const allowed = new Set(actor.projectIds);
  return allIds.filter((id) => allowed.has(id));
}

export function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
