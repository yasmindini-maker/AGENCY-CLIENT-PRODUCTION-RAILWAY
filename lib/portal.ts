import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const agenciesTable = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  website: text("website"),
  supportEmail: text("support_email"),
  intro: text("intro"),
  brandName: text("brand_name"),
  showPoweredBy: boolean("show_powered_by").notNull().default(false),
  ...timestamps,
});

export const portalUsersTable = pgTable("portal_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  ...timestamps,
});

export const membershipsTable = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    agencyId: uuid("agency_id").notNull(),
    role: text("role").notNull(),
    clientId: uuid("client_id"),
    ...timestamps,
  },
  (table) => [uniqueIndex("memberships_user_agency_idx").on(table.userId, table.agencyId)],
);

export const projectAccessTable = pgTable(
  "project_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("project_access_unique_idx").on(table.projectId, table.membershipId)],
);

export const invitesTable = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  clientId: uuid("client_id"),
  projectId: uuid("project_id"),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id"),
  ...timestamps,
});

export const clientsTable = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company").notNull(),
    initials: text("initials").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("clients_agency_email_idx").on(table.agencyId, table.email)],
);

export const projectsTable = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull(),
  clientId: uuid("client_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  health: text("health").notNull().default("on-track"),
  progress: integer("progress").notNull().default(0),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }).notNull().default("0"),
  paid: numeric("paid", { precision: 12, scale: 2 }).notNull().default("0"),
  ...timestamps,
});

export const milestonesTable = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("upcoming"),
  progress: integer("progress").notNull().default(0),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  ...timestamps,
});

export const tasksTable = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  owner: text("owner").notNull().default("Unassigned"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("todo"),
  ...timestamps,
});

export const deliverablesTable = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull().default("#"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  shareCount: integer("share_count").notNull().default(0),
  ...timestamps,
});

export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  number: text("number").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("sent"),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  issuedDate: date("issued_date", { mode: "string" }).notNull(),
  ...timestamps,
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  read: boolean("read").notNull().default(false),
  ...timestamps,
});

export const activityTable = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  agencyId: uuid("agency_id").notNull(),
  projectId: uuid("project_id"),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  type: text("type").notNull(),
  ...timestamps,
});

export const insertAgencySchema = createInsertSchema(agenciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliverableSchema = createInsertSchema(deliverablesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true, updatedAt: true });

export type Agency = z.infer<typeof insertAgencySchema>;
export type Client = z.infer<typeof insertClientSchema>;
export type Project = z.infer<typeof insertProjectSchema>;
export type Milestone = z.infer<typeof insertMilestoneSchema>;
export type Task = z.infer<typeof insertTaskSchema>;
export type Deliverable = z.infer<typeof insertDeliverableSchema>;
export type Invoice = z.infer<typeof insertInvoiceSchema>;
export type Notification = z.infer<typeof insertNotificationSchema>;
export type Activity = z.infer<typeof insertActivitySchema>;
