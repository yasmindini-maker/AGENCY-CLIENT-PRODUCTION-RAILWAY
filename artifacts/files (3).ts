import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, deliverablesTable } from "@workspace/db";
import { z } from "zod";
import { actorOf, requirePortalUser, requireStaff } from "../lib/auth";
import { getProjectInAgency } from "../lib/portal-store";
import { openStoredFile, storeDeliverableFile } from "../lib/files";
import { uploadToR2, deleteFromR2, validateFileUpload } from "../lib/r2-storage";

const router: IRouter = Router();
router.use(requirePortalUser);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }, // Increased to 50MB for R2
  fileFilter: (_req, file, cb) => {
    const validation = validateFileUpload({
      size: file.size,
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    
    if (!validation.valid) {
      cb(new Error(validation.error || "This file type is not allowed"));
      return;
    }
    cb(null, true);
  },
});

const meta = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
});

router.post("/deliverables", requireStaff, upload.single("file"), async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const parsed = meta.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const project = await getProjectInAgency(actor, parsed.data.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "A file is required" });
    return;
  }

  // Try R2 upload first, fall back to local storage
  let stored;
  const r2Result = await uploadToR2({
    file: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype,
    projectId: project.id,
  });

  if (r2Result.success && r2Result.url) {
    stored = {
      url: r2Result.url,
      storageKey: r2Result.storageKey,
    };
  } else {
    // Fall back to local storage
    stored = await storeDeliverableFile({
      agencyId: actor.agencyId,
      projectId: project.id,
      filename: file.originalname,
      mimeType: file.mimetype,
      body: file.buffer,
    });
  }

  const [deliverable] = await db
    .insert(deliverablesTable)
    .values({
      projectId: project.id,
      title: parsed.data.title || file.originalname,
      type: file.mimetype.split("/")[1] || "file",
      url: stored.url,
      storageKey: stored.storageKey,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    })
    .returning();
  res.status(201).json({
    ...deliverable,
    url: `/api/deliverables/${deliverable.id}/file`,
    storageWarning: r2Result.error, // Inform client if R2 isn't configured
    updatedAt: deliverable.updatedAt.toISOString(),
  });
});

router.get("/deliverables/:deliverableId/file", async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const deliverableId = z.string().uuid().safeParse(req.params.deliverableId);
  if (!deliverableId.success) {
    res.status(400).json({ error: "Invalid deliverable" });
    return;
  }
  const [deliverable] = await db
    .select()
    .from(deliverablesTable)
    .where(eq(deliverablesTable.id, deliverableId.data))
    .limit(1);
  if (!deliverable) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  const project = await getProjectInAgency(actor, deliverable.projectId);
  if (!project) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  // If file is stored in R2 with a public URL, redirect to it
  if (deliverable.storageKey && deliverable.url && !deliverable.url.startsWith('/api')) {
    res.redirect(deliverable.url);
    return;
  }

  // Otherwise, serve from local storage
  if (!deliverable.storageKey) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const stored = await openStoredFile(deliverable.storageKey);
    res.setHeader("Content-Type", deliverable.mimeType || stored.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${deliverable.title.replace(/"/g, "")}"`);
    stored.stream.pipe(res);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

router.delete("/deliverables/:deliverableId", requireStaff, async (req, res): Promise<void> => {
  const actor = actorOf(req);
  const deliverableId = z.string().uuid().safeParse(req.params.deliverableId);
  if (!deliverableId.success) {
    res.status(400).json({ error: "Invalid deliverable" });
    return;
  }
  const [deliverable] = await db
    .select()
    .from(deliverablesTable)
    .where(eq(deliverablesTable.id, deliverableId.data))
    .limit(1);
  if (!deliverable) {
    res.status(404).json({ error: "Deliverable not found" });
    return;
  }
  const project = await getProjectInAgency(actor, deliverable.projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Delete from R2 if storage key exists
  if (deliverable.storageKey) {
    await deleteFromR2(deliverable.storageKey);
  }

  // Delete from database
  await db.delete(deliverablesTable).where(eq(deliverablesTable.id, deliverable.id));

  res.status(204).send();
});

export default router;
