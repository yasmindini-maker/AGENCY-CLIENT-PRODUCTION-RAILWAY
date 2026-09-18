import { describe, expect, it } from "vitest";
import {
  canAccessProject,
  canInviteClients,
  canManageTeam,
  canMutateWorkspace,
  escapeIlike,
  scopedProjectIds,
  type PortalActor,
} from "./access";

const agencyA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const agencyB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const projectA = "11111111-1111-1111-1111-111111111111";
const projectB = "22222222-2222-2222-2222-222222222222";

function actor(overrides: Partial<PortalActor>): PortalActor {
  return {
    userId: "user-1",
    clerkUserId: "clerk_1",
    email: "maya@studio.test",
    name: "Maya Chen",
    membershipId: "mem-1",
    agencyId: agencyA,
    role: "agency_admin",
    projectIds: [],
    ...overrides,
  };
}

describe("tenant isolation", () => {
  it("lets agency staff see only their agency projects", () => {
    const admin = actor({ role: "agency_member" });
    expect(canAccessProject(admin, { id: projectA, agencyId: agencyA, clientId: "c1" })).toBe(true);
    expect(canAccessProject(admin, { id: projectB, agencyId: agencyB, clientId: "c2" })).toBe(false);
  });

  it("lets clients see only invited projects", () => {
    const client = actor({
      role: "client",
      clientId: "c1",
      projectIds: [projectA],
    });
    expect(canAccessProject(client, { id: projectA, agencyId: agencyA, clientId: "c1" })).toBe(true);
    expect(canAccessProject(client, { id: projectB, agencyId: agencyA, clientId: "c2" })).toBe(false);
    expect(canAccessProject(client, { id: projectA, agencyId: agencyB, clientId: "c1" })).toBe(false);
  });

  it("hides existence of other tenants", () => {
    expect(canAccessProject(actor({}), undefined)).toBe(false);
  });

  it("scopes list results for clients", () => {
    const client = actor({ role: "client", projectIds: [projectA] });
    expect(scopedProjectIds(client, [projectA, projectB])).toEqual([projectA]);
    expect(scopedProjectIds(actor({ role: "agency_admin" }), [projectA, projectB])).toEqual([
      projectA,
      projectB,
    ]);
  });
});

describe("role permissions", () => {
  it("restricts mutations and invites", () => {
    const client = actor({ role: "client", projectIds: [projectA] });
    expect(canMutateWorkspace(client)).toBe(false);
    expect(canInviteClients(client)).toBe(false);
    expect(canManageTeam(client)).toBe(false);
    expect(canMutateWorkspace(actor({ role: "agency_member" }))).toBe(true);
    expect(canManageTeam(actor({ role: "agency_member" }))).toBe(false);
    expect(canManageTeam(actor({ role: "agency_admin" }))).toBe(true);
  });

  it("escapes user search wildcards", () => {
    expect(escapeIlike("100%_done")).toBe("100\\%\\_done");
  });
});
