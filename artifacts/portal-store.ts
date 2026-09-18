import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import {
  activityTable,
  agenciesTable,
  clientsTable,
  deliverablesTable,
  invoicesTable,
  milestonesTable,
  notificationsTable,
  projectsTable,
  tasksTable,
  db,
} from "@workspace/db";
import { escapeIlike, type PortalActor } from "./access";

export const demoAgencyId = "7d5f8c0d-15f2-4dfc-9ed8-24b22ce66531";
const clientIds = {
  halden: "1a3a1de2-9cb3-4f9e-a9fa-934e2bf6b1c1",
  northstar: "2b4b2ef3-acb4-40af-b0ab-a45f3cf7c2d2",
  atlas: "3c5c3ff4-bdc5-41b0-c1bc-b56a4d88d3e3",
};
const projectIds = {
  halden: "4d6d40f5-ced6-42c1-d2cd-c67b5e99e4f4",
  northstar: "5e7e51a6-def7-43d2-e3de-d78c6f10f5a5",
  atlas: "6f8f62b7-ef08-44e3-f4ef-e89d7a11e6f6",
};

export async function ensureSeedData(): Promise<void> {
  const existing = await db.select({ id: agenciesTable.id }).from(agenciesTable).limit(1);
  if (!existing.length) {
    await db.insert(agenciesTable).values({
      id: demoAgencyId,
      name: "Northstar Studio",
      initials: "NS",
      brandName: "Northstar",
      website: "northstar.studio",
      supportEmail: "hello@northstar.studio",
      intro: "Clear work. Considered decisions. A shared view of what happens next.",
    });
  }
  const seededClients = await db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.agencyId, demoAgencyId)).limit(1);
  if (!seededClients.length) {
    await db.insert(clientsTable).values([
      { id: clientIds.halden, agencyId: demoAgencyId, name: "Halden & Low", email: "hello@haldenlow.co", company: "Halden & Low Interiors", initials: "HL" },
      { id: clientIds.northstar, agencyId: demoAgencyId, name: "Northstar Coffee", email: "team@northstar.coffee", company: "Northstar Coffee Co.", initials: "NC" },
      { id: clientIds.atlas, agencyId: demoAgencyId, name: "Atlas Health", email: "studio@atlas.health", company: "Atlas Health", initials: "AH" },
    ]);
  }
  const seededProjects = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.agencyId, demoAgencyId)).limit(1);
  if (seededProjects.length) return;
  await db.insert(projectsTable).values([
    { id: projectIds.halden, agencyId: demoAgencyId, clientId: clientIds.halden, name: "Website redesign", description: "A considered digital home for Halden & Low's next chapter.", status: "active", health: "on-track", progress: 68, dueDate: "2026-10-18", budget: "24000", paid: "16000" },
    { id: projectIds.northstar, agencyId: demoAgencyId, clientId: clientIds.northstar, name: "Brand refresh", description: "A warmer, more confident identity for the daily ritual.", status: "active", health: "at-risk", progress: 42, dueDate: "2026-09-28", budget: "14500", paid: "7250" },
    { id: projectIds.atlas, agencyId: demoAgencyId, clientId: clientIds.atlas, name: "Care platform", description: "Product strategy and interface direction for modern care teams.", status: "review", health: "on-track", progress: 84, dueDate: "2026-09-20", budget: "32000", paid: "32000" },
  ]);
  await db.insert(milestonesTable).values([
    { projectId: projectIds.halden, name: "Discovery & direction", description: "Align on goals, audience, and the new visual north star.", status: "complete", progress: 100, dueDate: "2026-08-22" },
    { projectId: projectIds.halden, name: "Design system", description: "Shape the reusable foundations and key page patterns.", status: "complete", progress: 100, dueDate: "2026-09-06" },
    { projectId: projectIds.halden, name: "Build & launch", description: "Bring the new experience to life and prepare the launch.", status: "in-progress", progress: 54, dueDate: "2026-10-18" },
    { projectId: projectIds.northstar, name: "Brand foundations", description: "Clarify positioning, voice, and the new identity system.", status: "in-progress", progress: 72, dueDate: "2026-09-15" },
    { projectId: projectIds.northstar, name: "Packaging rollout", description: "Extend the refreshed system into the first product touchpoints.", status: "upcoming", progress: 0, dueDate: "2026-09-28" },
    { projectId: projectIds.atlas, name: "Research synthesis", description: "Turn interviews and product evidence into a clear direction.", status: "complete", progress: 100, dueDate: "2026-08-30" },
    { projectId: projectIds.atlas, name: "Prototype review", description: "Review the prototype and capture final client feedback.", status: "in-progress", progress: 80, dueDate: "2026-09-20" },
  ]);
  await db.insert(tasksTable).values([
    { projectId: projectIds.halden, title: "Polish responsive navigation", owner: "Maya Chen", dueDate: "2026-09-16", priority: "high", status: "in-progress" },
    { projectId: projectIds.halden, title: "Prepare launch checklist", owner: "Maya Chen", dueDate: "2026-09-19", priority: "medium", status: "todo" },
    { projectId: projectIds.halden, title: "Approve final type scale", owner: "Client", dueDate: "2026-09-12", priority: "high", status: "completed" },
    { projectId: projectIds.northstar, title: "Review packaging directions", owner: "Client", dueDate: "2026-09-17", priority: "high", status: "todo" },
    { projectId: projectIds.northstar, title: "Export social templates", owner: "Jon Bell", dueDate: "2026-09-22", priority: "low", status: "todo" },
    { projectId: projectIds.atlas, title: "Document empty states", owner: "Maya Chen", dueDate: "2026-09-16", priority: "medium", status: "in-progress" },
  ]);
  await db.insert(deliverablesTable).values([
    { projectId: projectIds.halden, title: "Homepage prototype", type: "Figma", url: "https://figma.com", shareCount: 8 },
    { projectId: projectIds.halden, title: "Staging preview", type: "Preview", url: "https://example.com", shareCount: 3 },
    { projectId: projectIds.halden, title: "Content handoff", type: "Docs", url: "https://docs.google.com", shareCount: 5 },
    { projectId: projectIds.northstar, title: "Brand presentation", type: "PDF", url: "#", shareCount: 2 },
  ]);
  await db.insert(invoicesTable).values([
    { projectId: projectIds.halden, number: "INV-024", amount: "8000", status: "paid", dueDate: "2026-08-18", issuedDate: "2026-08-04" },
    { projectId: projectIds.halden, number: "INV-031", amount: "8000", status: "paid", dueDate: "2026-09-18", issuedDate: "2026-09-04" },
    { projectId: projectIds.halden, number: "INV-038", amount: "8000", status: "sent", dueDate: "2026-10-18", issuedDate: "2026-10-04" },
    { projectId: projectIds.northstar, number: "INV-042", amount: "7250", status: "overdue", dueDate: "2026-09-08", issuedDate: "2026-08-25" },
  ]);
  await db.insert(notificationsTable).values([
    { agencyId: demoAgencyId, title: "Milestone approved", description: "Halden & Low approved Design system.", type: "success", read: false },
    { agencyId: demoAgencyId, title: "Invoice due soon", description: "INV-042 for Northstar Coffee is overdue.", type: "warning", read: false },
    { agencyId: demoAgencyId, title: "New client comment", description: "Ava left feedback on Homepage prototype.", type: "comment", read: true },
  ]);
  await db.insert(activityTable).values([
    { agencyId: demoAgencyId, projectId: projectIds.halden, action: "completed the Design system milestone", actor: "Maya Chen", type: "milestone" },
    { agencyId: demoAgencyId, projectId: projectIds.atlas, action: "uploaded Prototype review notes", actor: "Maya Chen", type: "deliverable" },
    { agencyId: demoAgencyId, projectId: projectIds.northstar, action: "sent invoice INV-042", actor: "Northstar Studio", type: "invoice" },
    { agencyId: demoAgencyId, projectId: projectIds.halden, action: "commented on Homepage prototype", actor: "Ava Low", type: "comment" },
  ]);
}

function money(value: string | number): number {
  return Number(value);
}

function projectScope(actor: PortalActor) {
  if (actor.role === "client") {
    if (!actor.projectIds.length) return eq(projectsTable.id, "00000000-0000-0000-0000-000000000000");
    return and(eq(projectsTable.agencyId, actor.agencyId), inArray(projectsTable.id, actor.projectIds));
  }
  return eq(projectsTable.agencyId, actor.agencyId);
}

export async function projectRows(actor: PortalActor, search?: string, status?: string) {
  const projects = await db.select().from(projectsTable).where(
    and(
      projectScope(actor),
      search ? or(ilike(projectsTable.name, `%${escapeIlike(search)}%`), ilike(projectsTable.description, `%${escapeIlike(search)}%`)) : undefined,
      status ? eq(projectsTable.status, status) : undefined,
    ),
  ).orderBy(desc(projectsTable.updatedAt));
  if (!projects.length) return [];
  const projectIdList = projects.map((project) => project.id);
  const clientIdList = [...new Set(projects.map((project) => project.clientId))];
  const [clients, milestones, tasks] = await Promise.all([
    db.select().from(clientsTable).where(inArray(clientsTable.id, clientIdList)),
    db.select().from(milestonesTable).where(inArray(milestonesTable.projectId, projectIdList)),
    db.select().from(tasksTable).where(inArray(tasksTable.projectId, projectIdList)),
  ]);
  return projects.map((project) => {
    const client = clients.find((item) => item.id === project.clientId);
    return {
      id: project.id,
      name: project.name,
      clientName: client?.company ?? "Unknown client",
      clientId: project.clientId,
      status: project.status,
      health: project.health,
      progress: project.progress,
      dueDate: project.dueDate,
      budget: money(project.budget),
      paid: money(project.paid),
      milestoneCount: milestones.filter((item) => item.projectId === project.id).length,
      taskCount: tasks.filter((item) => item.projectId === project.id && item.status !== "completed").length,
      description: project.description,
    };
  });
}

export async function projectDetail(actor: PortalActor, id: string) {
  const projects = await projectRows(actor);
  const summary = projects.find((item) => item.id === id);
  if (!summary) return undefined;
  const [milestones, tasks, deliverables, invoices, activity] = await Promise.all([
    db.select().from(milestonesTable).where(eq(milestonesTable.projectId, id)).orderBy(milestonesTable.dueDate),
    db.select().from(tasksTable).where(eq(tasksTable.projectId, id)).orderBy(tasksTable.dueDate),
    db.select().from(deliverablesTable).where(eq(deliverablesTable.projectId, id)).orderBy(desc(deliverablesTable.updatedAt)),
    db.select().from(invoicesTable).where(eq(invoicesTable.projectId, id)).orderBy(desc(invoicesTable.issuedDate)),
    db.select().from(activityTable).where(eq(activityTable.projectId, id)).orderBy(desc(activityTable.createdAt)),
  ]);
  return {
    ...summary,
    milestones,
    tasks,
    deliverables: deliverables.map((item) => ({
      ...item,
      url: item.storageKey ? `/api/deliverables/${item.id}/file` : item.url,
      updatedAt: item.updatedAt.toISOString(),
    })),
    invoices: invoices.map((item) => ({ ...item, amount: money(item.amount) })),
    activity: activity.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  };
}

export async function getProjectInAgency(actor: PortalActor, projectId: string) {
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, projectId), projectScope(actor))).limit(1);
  return project;
}

export { clientIds, projectIds };
