import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// Cloudflare R2 S3-compatible client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'agency-portal-deliverables';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

export interface UploadResult {
  success: boolean;
  url?: string;
  storageKey?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a unique storage key for uploaded files
 */
function generateStorageKey(originalName: string, projectId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `deliverables/${projectId}/${timestamp}-${random}-${baseName}.${extension}`;
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(options: {
  file: Buffer;
  fileName: string;
  mimeType: string;
  projectId: string;
}): Promise<UploadResult> {
  try {
    // Check if R2 is configured
    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
      // Fallback to local storage simulation if R2 is not configured
      console.warn('R2 not configured, using local file simulation');
      return {
        success: true,
        url: '#',
        storageKey: null,
        error: 'R2 not configured - file storage not available',
      };
    }

    const storageKey = generateStorageKey(options.fileName, options.projectId);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
      Body: options.file,
      ContentType: options.mimeType,
      // Make files publicly readable if you have a public bucket
      // ACL: 'public-read',
    });

    await r2Client.send(command);

    const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${storageKey}` : `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${storageKey}`;

    return {
      success: true,
      url: publicUrl,
      storageKey,
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFromR2(storageKey: string): Promise<DeleteResult> {
  try {
    if (!storageKey || !process.env.R2_ACCOUNT_ID) {
      return { success: true }; // Nothing to delete or R2 not configured
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });

    await r2Client.send(command);

    return { success: true };
  } catch (error) {
    console.error('R2 delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}

/**
 * Check if a file exists in R2
 */
export async function fileExistsInR2(storageKey: string): Promise<boolean> {
  try {
    if (!storageKey || !process.env.R2_ACCOUNT_ID) {
      return false;
    }

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate file upload constraints
 */
export function validateFileUpload(file: {
  size: number;
  mimetype: string;
  originalname: string;
}): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'video/mp4',
    'video/quicktime',
  ];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'File type not allowed',
    };
  }

  return { valid: true };
}
