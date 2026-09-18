import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StoredFile = {
  storageKey: string;
  url: string;
};

function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

function r2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function localRoot(): string {
  return process.env.UPLOAD_DIR || path.resolve(process.cwd(), "data", "uploads");
}

export async function storeDeliverableFile(options: {
  agencyId: string;
  projectId: string;
  filename: string;
  mimeType: string;
  body: Buffer;
}): Promise<StoredFile> {
  const safeName = options.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${options.agencyId}/${options.projectId}/${randomUUID()}-${safeName}`;

  if (r2Configured()) {
    const bucket = process.env.R2_BUCKET!;
    await r2Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: options.body,
        ContentType: options.mimeType,
      }),
    );
    const publicBase = process.env.R2_PUBLIC_URL;
    return {
      storageKey: `r2:${key}`,
      url: publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : `/api/deliverables/file/${encodeURIComponent(`r2:${key}`)}`,
    };
  }

  const fullPath = path.join(localRoot(), key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, options.body);
  return {
    storageKey: `local:${key}`,
    url: `/api/deliverables/file/${encodeURIComponent(`local:${key}`)}`,
  };
}

export async function openStoredFile(storageKey: string): Promise<{ stream: Readable; contentType?: string }> {
  const [driver, ...rest] = storageKey.split(":");
  const key = rest.join(":");
  if (driver === "r2") {
    const response = await r2Client().send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: key,
      }),
    );
    if (!response.Body) {
      throw new Error("Missing file body");
    }
    return {
      stream: response.Body as Readable,
      contentType: response.ContentType,
    };
  }
  if (driver === "local") {
    const fullPath = path.join(localRoot(), key);
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(localRoot()))) {
      throw new Error("Invalid storage key");
    }
    return { stream: createReadStream(resolved) };
  }
  throw new Error("Unknown storage driver");
}
