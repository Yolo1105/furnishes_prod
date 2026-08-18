import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type PrivateStorageObject = {
  bytes: Uint8Array;
  mimeType: string;
};

interface PrivateStorageProvider {
  putObject(input: {
    key: string;
    bytes: Uint8Array;
    mimeType: string;
  }): Promise<void>;
  getObject(key: string): Promise<PrivateStorageObject>;
  deleteObject(key: string): Promise<void>;
}

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

function absolutePath(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    normalized.includes("..") ||
    path.isAbsolute(normalized) ||
    normalized.includes("\0")
  ) {
    throw new Error("Invalid storage key.");
  }
  return path.join(UPLOAD_ROOT, normalized);
}

const localPrivateStorage: PrivateStorageProvider = {
  async putObject({ key, bytes }) {
    const absolute = absolutePath(key);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
  },

  async getObject(key) {
    const absolute = absolutePath(key);
    const buffer = await readFile(absolute);
    return {
      bytes: new Uint8Array(buffer),
      mimeType: "application/octet-stream",
    };
  },

  async deleteObject(key) {
    try {
      await unlink(absolutePath(key));
    } catch {
      // Idempotent for missing local files.
    }
  },
};

function createS3PrivateStorage(): PrivateStorageProvider {
  const bucket = process.env.STORAGE_S3_BUCKET?.trim();
  const region = process.env.STORAGE_S3_REGION?.trim() || "auto";
  const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.STORAGE_S3_ENDPOINT?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage requires STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, and STORAGE_S3_SECRET_ACCESS_KEY.",
    );
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE !== "0",
        }
      : {}),
  });

  return {
    async putObject({ key, bytes, mimeType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: mimeType,
        }),
      );
    },

    async getObject(key) {
      const result = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const body = result.Body;
      if (!body) throw new Error("Empty storage object.");
      const bytes = new Uint8Array(await body.transformToByteArray());
      return {
        bytes,
        mimeType: result.ContentType ?? "application/octet-stream",
      };
    },

    async deleteObject(key) {
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
        );
      } catch {
        // Idempotent delete.
      }
    },
  };
}

/**
 * Resolve private object storage.
 * Default `local` (`.data/uploads`). Set `STORAGE_PROVIDER=s3` for S3/R2.
 */
export function getPrivateStorage(): PrivateStorageProvider {
  const provider = (process.env.STORAGE_PROVIDER ?? "local")
    .trim()
    .toLowerCase();
  if (provider === "s3") {
    return createS3PrivateStorage();
  }
  return localPrivateStorage;
}
