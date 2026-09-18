import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  activityTable,
  agenciesTable,
  clientsTable,
  db,
  deliverablesTable,
  invoicesTable,
  milestonesTable,
  notificationsTable,
  projectsTable,
  tasksTable,
} from "@workspace/db";
import {
  CreateInvoiceBody,
  CreateMilestoneBody,
  CreateProjectBody,
  CreateTaskBody,
  GetDashboardResponse,
  GetProjectParams,
  ListActivityQueryParams,
  ListActivityResponse,
  ListClientsResponse,
  ListDeliverablesQueryParams,
  ListDeliverablesResponse,
  ListInvoicesQueryParams,
  ListInvoicesResponse,
  ListMilestonesQueryParams,
  ListMilestonesResponse,
  ListNotificationsResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  MarkInvoicePaidParams,
  UpdateMilestoneBody,
  UpdateMilestoneParams,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";
import { actorOf, requirePortalUser, requireStaff } from "../lib/auth";
import { getProjectInAgency, projectDetail, projectRows } from "../lib/portal-store";

const router: IRouter = Router();
const calendar = (value: Date | string): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;

router.use(requirePortalUser);

async function scopedProjectIdsFor(actor: ReturnType<typeof actorOf>, projectId?: string) {
  if (projectId) {
    const project = await getProjectInAgency(actor, projectId);
    return project ? [project.id] : [];
  }
  const projects = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(eq(projectsTable.agencyId, actor.agencyId));
  const ids = projects.map((item) => item.id);
  if (actor.role === "client") return ids.filter((id) => actor.projectIds.includes(id));
  return ids;
}

router.get("/dashboard", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const [agency] = await db.select().from(agenciesTable).where(eq(agenciesTable.id, actor.agencyId)).limit(1);
  const [projects, notifications, activity] = await Promise.all([
    projectRows(actor),
    db.select().from(notificationsTable).where(eq(notificationsTable.agencyId, actor.agencyId)).orderBy(desc(notificationsTable.createdAt)).limit(5),
    db.select().from(activityTable).where(eq(activityTable.agencyId, actor.agencyId)).orderBy(desc(activityTable.createdAt)).limit(6),
  ]);
  const visibleActivity =
    actor.role === "client"
      ? activity.filter((item) => !item.projectId || actor.projectIds.includes(item.projectId))
      : activity;
  const response = {
    agency: {
      id: actor.agencyId,
      name: agency?.name || "Studio",
      initials: agency?.initials || "ST",
    },
    stats: {
      activeProjects: projects.filter((project) => project.status === "active").length,
      dueThisWeek: projects.filter((project) => project.health === "at-risk").length,
      outstanding: projects.reduce((sum, project) => sum + project.budget - project.paid, 0),
      unreadNotifications: actor.role === "client" ? 0 : notifications.filter((item) => !item.read).length,
    },
    projects,
    notifications:
      actor.role === "client"
        ? []
        : notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    activity: visibleActivity.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  };
  res.json(GetDashboardResponse.parse(response));
});

router.get("/projects", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = ListProjectsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const projects = await projectRows(actor, parsed.data.search, parsed.data.status);
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  res.json(ListProjectsResponse.parse({ items: projects.slice(start, start + pageSize), total: projects.length, page, pageSize }));
});

router.post("/projects", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.agencyId, actor.agencyId)))
    .limit(1);
  if (!client) {
    res.status(400).json({ error: "Client not found in this workspace" });
    return;
  }
  const [project] = await db.insert(projectsTable).values({
    agencyId: actor.agencyId,
    clientId: parsed.data.clientId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    dueDate: calendar(parsed.data.dueDate),
    budget: String(parsed.data.budget),
  }).returning();
  const projects = await projectRows(actor);
  res.status(201).json(ListProjectsResponse.shape.items.element.parse(projects.find((item) => item.id === project.id)));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = GetProjectParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const detail = await projectDetail(actor, parsed.data.projectId);
  if (!detail) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(detail);
});

router.patch("/projects/:projectId", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const existing = await getProjectInAgency(actor, params.data.projectId);
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.update(projectsTable).set({
    name: body.data.name,
    status: body.data.status,
    health: body.data.health,
    progress: body.data.progress,
    dueDate: body.data.dueDate === undefined ? undefined : calendar(body.data.dueDate),
    budget: body.data.budget === undefined ? undefined : String(body.data.budget),
    description: body.data.description,
    updatedAt: new Date(),
  }).where(eq(projectsTable.id, params.data.projectId));
  const projects = await projectRows(actor);
  const project = projects.find((item) => item.id === params.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(project);
});

router.delete("/projects/:projectId", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const existing = await getProjectInAgency(actor, params.data.projectId);
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.update(projectsTable).set({ status: "archived", updatedAt: new Date() }).where(eq(projectsTable.id, params.data.projectId));
  res.sendStatus(204);
});

router.get("/clients", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const [clients, projects] = await Promise.all([
    db.select().from(clientsTable).where(eq(clientsTable.agencyId, actor.agencyId)).orderBy(clientsTable.name),
    db.select().from(projectsTable).where(eq(projectsTable.agencyId, actor.agencyId)),
  ]);
  res.json(ListClientsResponse.parse(clients.map((client) => ({ ...client, projectCount: projects.filter((project) => project.clientId === client.id).length }))));
});

router.get("/tasks", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = ListTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ids = await scopedProjectIdsFor(actor, parsed.data.projectId);
  if (!ids.length) {
    res.json(ListTasksResponse.parse({ items: [], total: 0, page: parsed.data.page ?? 1, pageSize: parsed.data.pageSize ?? 20 }));
    return;
  }
  const filters = [inArray(tasksTable.projectId, ids), parsed.data.status ? eq(tasksTable.status, parsed.data.status) : undefined];
  const tasks = await db.select().from(tasksTable).where(and(...filters)).orderBy(tasksTable.dueDate);
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 20;
  res.json(ListTasksResponse.parse({ items: tasks.slice((page - 1) * pageSize, page * pageSize), total: tasks.length, page, pageSize }));
});

router.post("/tasks", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const project = await getProjectInAgency(actor, parsed.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    projectId: parsed.data.projectId,
    title: parsed.data.title,
    owner: parsed.data.owner ?? "Unassigned",
    dueDate: calendar(parsed.data.dueDate),
    priority: parsed.data.priority,
  }).returning();
  res.status(201).json(task);
});

router.patch("/tasks/:taskId", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.taskId)).limit(1);
  if (!existing || !(await getProjectInAgency(actor, existing.projectId))) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const [task] = await db.update(tasksTable).set({
    title: body.data.title,
    owner: body.data.owner,
    dueDate: body.data.dueDate === undefined ? undefined : calendar(body.data.dueDate),
    priority: body.data.priority,
    status: body.data.status,
    updatedAt: new Date(),
  }).where(eq(tasksTable.id, params.data.taskId)).returning();
  res.json(task);
});

router.get("/milestones", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = ListMilestonesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ids = await scopedProjectIdsFor(actor, parsed.data.projectId);
  if (!ids.length) {
    res.json(ListMilestonesResponse.parse([]));
    return;
  }
  const milestones = await db.select().from(milestonesTable).where(inArray(milestonesTable.projectId, ids)).orderBy(milestonesTable.dueDate);
  res.json(ListMilestonesResponse.parse(milestones));
});

router.post("/milestones", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = CreateMilestoneBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(await getProjectInAgency(actor, parsed.data.projectId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [milestone] = await db.insert(milestonesTable).values({
    projectId: parsed.data.projectId,
    name: parsed.data.name,
    dueDate: calendar(parsed.data.dueDate),
    description: parsed.data.description ?? "",
  }).returning();
  res.status(201).json(milestone);
});

router.patch("/milestones/:milestoneId", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const params = UpdateMilestoneParams.safeParse(req.params);
  const body = UpdateMilestoneBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db.select().from(milestonesTable).where(eq(milestonesTable.id, params.data.milestoneId)).limit(1);
  if (!existing || !(await getProjectInAgency(actor, existing.projectId))) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }
  const [milestone] = await db.update(milestonesTable).set({
    name: body.data.name,
    status: body.data.status,
    progress: body.data.progress,
    dueDate: body.data.dueDate === undefined ? undefined : calendar(body.data.dueDate),
    description: body.data.description,
    updatedAt: new Date(),
  }).where(eq(milestonesTable.id, params.data.milestoneId)).returning();
  res.json(milestone);
});

router.get("/deliverables", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = ListDeliverablesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ids = await scopedProjectIdsFor(actor, parsed.data.projectId);
  if (!ids.length) {
    res.json(ListDeliverablesResponse.parse([]));
    return;
  }
  const deliverables = await db.select().from(deliverablesTable).where(inArray(deliverablesTable.projectId, ids)).orderBy(desc(deliverablesTable.updatedAt));
  res.json(ListDeliverablesResponse.parse(deliverables.map((item) => ({
    ...item,
    url: item.storageKey ? `/api/deliverables/${item.id}/file` : item.url,
    updatedAt: item.updatedAt.toISOString(),
  }))));
});

router.get("/invoices", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = ListInvoicesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ids = await scopedProjectIdsFor(actor, parsed.data.projectId);
  if (!ids.length) {
    res.json(ListInvoicesResponse.parse([]));
    return;
  }
  const invoices = await db.select().from(invoicesTable).where(inArray(invoicesTable.projectId, ids)).orderBy(desc(invoicesTable.issuedDate));
  res.json(ListInvoicesResponse.parse(invoices.map((item) => ({ ...item, amount: Number(item.amount) }))));
});

router.post("/invoices", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = CreateInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(await getProjectInAgency(actor, parsed.data.projectId))) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [invoice] = await db.insert(invoicesTable).values({
    projectId: parsed.data.projectId,
    amount: String(parsed.data.amount),
    number: `INV-${Math.floor(100 + Math.random() * 899)}`,
    dueDate: calendar(parsed.data.dueDate),
    issuedDate: new Date().toISOString().slice(0, 10),
  }).returning();
  res.status(201).json({ ...invoice, amount: Number(invoice.amount) });
});

router.post("/invoices/:invoiceId/paid", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const params = MarkInvoicePaidParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.data.invoiceId)).limit(1);
  if (!existing || !(await getProjectInAgency(actor, existing.projectId))) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  const [invoice] = await db.update(invoicesTable).set({ status: "paid", updatedAt: new Date() }).where(eq(invoicesTable.id, params.data.invoiceId)).returning();
  res.json({ ...invoice, amount: Number(invoice.amount) });
});

router.get("/notifications", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  if (actor.role === "client") {
    res.json(ListNotificationsResponse.parse([]));
    return;
  }
  const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.agencyId, actor.agencyId)).orderBy(desc(notificationsTable.createdAt));
  res.json(ListNotificationsResponse.parse(notifications.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))));
});

router.get("/activity", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = ListActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.projectId) {
    const project = await getProjectInAgency(actor, parsed.data.projectId);
    if (!project) {
      res.json(ListActivityResponse.parse([]));
      return;
    }
  }
  const activity = await db.select().from(activityTable).where(and(eq(activityTable.agencyId, actor.agencyId), parsed.data.projectId ? eq(activityTable.projectId, parsed.data.projectId) : undefined)).orderBy(desc(activityTable.createdAt));
  const visible =
    actor.role === "client"
      ? activity.filter((item) => item.projectId && actor.projectIds.includes(item.projectId))
      : activity;
  res.json(ListActivityResponse.parse(visible.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))));
});

export default router;
