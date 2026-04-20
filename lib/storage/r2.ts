/**
 * Cloudflare R2 storage adapter.
 *
 * Uses signed URLs so the browser uploads directly to R2 — files don't
 * pass through our server. Cheaper, faster, scalable.
 *
 * Flow:
 *   1. Browser calls POST /api/uploads/sign with file metadata
 *   2. Our server validates (auth, size, mime type) + generates signed URL
 *   3. Browser PUTs the file directly to R2
 *   4. Browser calls POST /api/uploads/confirm with the storage key
 *   5. Our server verifies the upload via R2 HEAD + writes the DB record
 *
 * INSTALL:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * R2 SETUP:
 *   1. Create R2 bucket in Cloudflare dashboard
 *   2. Generate R2 API token (Settings → R2 → Manage R2 API Tokens)
 *   3. Set CORS on the bucket to allow PUT from your domain
 *   4. Optional: configure a public Worker domain for serving uploads
 *
 * If R2_PUBLIC_URL points at a public bucket, anyone with the object URL can read
 * the file. Keys use unguessable segments; still treat URLs as sensitive. For
 * stricter control, use a private bucket plus signed GET URLs or GET /api/uploads/[id].
 */

import "server-only";
import { randomUUID } from "crypto";
import {
  UPLOAD_MAX_BYTES,
  uploadMaxSizeMegabytes,
} from "@/lib/upload/upload-limits";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "furnishes-uploads";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://uploads.furnishes.sg

const isConfigured =
  !!R2_ACCOUNT_ID && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY;

const ENDPOINT = R2_ACCOUNT_ID
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : "";

/* ── Upload constraints ───────────────────────────────────── */

export const MAX_UPLOAD_BYTES = UPLOAD_MAX_BYTES;

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

/* ── Lazy SDK init ────────────────────────────────────────── */

type S3Client = {
  send: (cmd: unknown) => Promise<unknown>;
};

let s3Client: S3Client | null = null;

async function getClient(): Promise<S3Client | null> {
  if (s3Client) return s3Client;
  if (!isConfigured) return null;
  const { S3Client: Client } =
    (await import("@aws-sdk/client-s3")) as unknown as {
      S3Client: new (config: unknown) => S3Client;
    };
  s3Client = new Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
  return s3Client;
}

/* ── Public API ───────────────────────────────────────────── */

export type SignedUploadUrl = {
  /** PUT this URL with the raw file body */
  uploadUrl: string;
  /** Storage key — pass back to confirm endpoint */
  storageKey: string;
  /** Public URL where the file can be served (if R2_PUBLIC_URL set) */
  publicUrl: string | null;
  /** Expiry timestamp (ms) */
  expiresAt: number;
};

/**
 * Generate a signed upload URL for a new file.
 *
 * @param prefix - storage path prefix, e.g. "support-attachments" or "uploads"
 * @param filename - original filename (used for Content-Disposition)
 * @param mimeType - validated against ALLOWED_MIME_TYPES
 * @param sizeBytes - validated against MAX_UPLOAD_BYTES
 */
export async function signUploadUrl(args: {
  prefix: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** Signed-in user — key segment `uploads/<userId>/...` */
  userId?: string;
  /** Guest / Eva chat — key segment `uploads/guest/<conversationId>/...` (do not pass both userId and conversationId) */
  conversationId?: string;
}): Promise<
  { ok: true; data: SignedUploadUrl } | { ok: false; error: string }
> {
  if (!ALLOWED_MIME_TYPES.has(args.mimeType)) {
    return { ok: false, error: `Mime type "${args.mimeType}" not allowed` };
  }
  if (args.sizeBytes > MAX_UPLOAD_BYTES) {
    const maxMb = uploadMaxSizeMegabytes();
    return {
      ok: false,
      error: `File too large (${Math.round(args.sizeBytes / 1024 / 1024)}MB > ${maxMb}MB)`,
    };
  }

  if (args.userId && args.conversationId) {
    return {
      ok: false,
      error: "Pass either userId or conversationId for upload scope, not both.",
    };
  }

  const client = await getClient();
  if (!client) {
    return {
      ok: false,
      error:
        "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.",
    };
  }

  // Build a unique storage key
  // Format: <prefix>/<userId|guest/convId>/<uuid>-<sanitized-filename>
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const uuid = randomUUID().split("-")[0]; // short uuid prefix
  const scopePart = args.userId
    ? `${args.userId}/`
    : args.conversationId
      ? `guest/${args.conversationId}/`
      : "";
  const storageKey = `${args.prefix}/${scopePart}${uuid}-${safeName}`;

  try {
    const { PutObjectCommand } =
      (await import("@aws-sdk/client-s3")) as unknown as {
        PutObjectCommand: new (input: unknown) => unknown;
      };
    const { getSignedUrl } =
      (await import("@aws-sdk/s3-request-presigner")) as unknown as {
        getSignedUrl: (
          client: S3Client,
          cmd: unknown,
          opts: { expiresIn: number },
        ) => Promise<string>;
      };

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      ContentType: args.mimeType,
      ContentLength: args.sizeBytes,
    });

    const expiresIn = 5 * 60; // 5 minutes — enough for upload, short enough to limit abuse
    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return {
      ok: true,
      data: {
        uploadUrl,
        storageKey,
        publicUrl: R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${storageKey}` : null,
        expiresAt: Date.now() + expiresIn * 1000,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(e, { tags: { module: "r2", op: "sign" } });
    } catch {
      // ignore
    }
    return { ok: false, error: message };
  }
}

/**
 * Verify a file actually got uploaded by HEAD-ing the object.
 * Returns metadata if it exists, null otherwise.
 */
export async function verifyUpload(
  storageKey: string,
): Promise<
  | { ok: true; sizeBytes: number; mimeType: string }
  | { ok: false; error: string }
> {
  const client = await getClient();
  if (!client) return { ok: false, error: "R2 not configured" };
  try {
    const { HeadObjectCommand } =
      (await import("@aws-sdk/client-s3")) as unknown as {
        HeadObjectCommand: new (input: unknown) => unknown;
      };
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
    });
    const response = (await client.send(command)) as {
      ContentLength?: number;
      ContentType?: string;
    };
    if (response.ContentLength === undefined) {
      return { ok: false, error: "Object not found in R2" };
    }
    return {
      ok: true,
      sizeBytes: response.ContentLength,
      mimeType: response.ContentType ?? "application/octet-stream",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Read the first N bytes of an object (for content sniffing on confirm).
 */
export async function getObjectFirstBytes(
  storageKey: string,
  byteCount: number,
): Promise<Buffer | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    const { GetObjectCommand } =
      (await import("@aws-sdk/client-s3")) as unknown as {
        GetObjectCommand: new (input: unknown) => unknown;
      };
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Range: `bytes=0-${Math.max(0, byteCount - 1)}`,
    });
    const response = (await client.send(command)) as {
      Body?: AsyncIterable<Uint8Array>;
    };
    if (!response.Body) return null;
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of response.Body) {
      const buf = Buffer.from(chunk);
      chunks.push(buf);
      total += buf.length;
      if (total >= byteCount) break;
    }
    if (chunks.length === 0) return null;
    return Buffer.concat(chunks).subarray(0, byteCount);
  } catch {
    return null;
  }
}

/**
 * Delete an uploaded file. Used for cleanup when DB write fails after
 * upload, or when a user removes an attachment.
 */
export async function deleteUpload(storageKey: string): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;
  try {
    const { DeleteObjectCommand } =
      (await import("@aws-sdk/client-s3")) as unknown as {
        DeleteObjectCommand: new (input: unknown) => unknown;
      };
    await client.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }),
    );
    return true;
  } catch {
    return false;
  }
}

export const r2IsConfigured = isConfigured;

/** Public HTTPS URL for an object key (requires `R2_PUBLIC_URL`). */
export function publicUrlForStorageKey(storageKey: string): string | null {
  if (!R2_PUBLIC_URL?.trim()) return null;
  const base = R2_PUBLIC_URL.replace(/\/$/, "");
  const key = storageKey.replace(/^\//, "");
  return `${base}/${key}`;
}

/**
 * Server-side upload (e.g. ingesting provider URLs into durable storage).
 * Not subject to browser upload size/mime limits from `signUploadUrl`.
 */
export async function putObjectBuffer(args: {
  storageKey: string;
  body: Buffer;
  contentType: string;
}): Promise<
  { ok: true; publicUrl: string | null } | { ok: false; error: string }
> {
  const client = await getClient();
  if (!client) {
    return {
      ok: false,
      error:
        "R2 not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.",
    };
  }
  try {
    const { PutObjectCommand } =
      (await import("@aws-sdk/client-s3")) as unknown as {
        PutObjectCommand: new (input: unknown) => unknown;
      };
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: args.storageKey,
        Body: args.body,
        ContentType: args.contentType,
      }),
    );
    return { ok: true, publicUrl: publicUrlForStorageKey(args.storageKey) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(e, { tags: { module: "r2", op: "putBuffer" } });
    } catch {
      // ignore
    }
    return { ok: false, error: message };
  }
}
