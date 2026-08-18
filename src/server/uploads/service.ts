import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { getPrivateStorage } from "@/server/storage/private-storage";
import { assertRowQuota, maxUploadBytes, maxUploadFiles } from "@/server/quota";

const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = MAX_BYTES;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
]);

function sniffMagicMime(bytes: Buffer): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }
  return null;
}

function resolveMimeType(
  filename: string,
  mimeType: string,
  bytes: Buffer,
): string {
  const sniffed = sniffMagicMime(bytes);
  if (sniffed) return sniffed;
  const trimmed = mimeType.trim().toLowerCase();
  const lower = filename.toLowerCase();
  if (
    trimmed === "text/plain" ||
    lower.endsWith(".txt") ||
    lower.endsWith(".text")
  ) {
    return "text/plain";
  }
  return trimmed;
}

export async function listUploads(userId: string) {
  const rows = await prisma.upload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    status: row.status,
    source: row.source,
    projectId: row.projectId,
    projectName: row.project?.name ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function createUpload(
  userId: string,
  file: {
    filename: string;
    mimeType: string;
    bytes: Buffer;
    projectId?: string | null;
  },
): Promise<
  ServiceResult<{ id: string }, "validation" | "forbidden" | "rate_limited">
> {
  const mimeType = resolveMimeType(file.filename, file.mimeType, file.bytes);
  if (!ALLOWED_TYPES.has(mimeType)) {
    return err("validation", "Unsupported file type.", {
      file: "Allowed: JPEG, PNG, WebP, PDF, or plain text.",
    });
  }
  if (file.bytes.byteLength === 0) {
    return err("validation", "File is empty.", { file: "File is empty." });
  }
  if (file.bytes.byteLength > MAX_BYTES) {
    return err("validation", "File is too large.", {
      file: "Maximum upload size is 5 MB.",
    });
  }

  const filesQuota = await assertRowQuota(
    () => prisma.upload.count({ where: { userId } }),
    maxUploadFiles(),
    "uploads",
  );
  if (!filesQuota.ok) return filesQuota;

  const usage = await prisma.upload.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
  });
  if ((usage._sum.sizeBytes ?? 0) + file.bytes.byteLength > maxUploadBytes()) {
    return err("rate_limited", "You have reached the maximum upload storage.");
  }

  if (file.projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: file.projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });
    if (!project) {
      return err("forbidden", "Project not found or inaccessible.");
    }
  }

  const storageKey = `${userId}/${randomUUID()}-${file.filename.replace(/[^\w.-]+/g, "_")}`;
  await getPrivateStorage().putObject({
    key: storageKey,
    bytes: new Uint8Array(file.bytes),
    mimeType,
  });

  const upload = await prisma.upload.create({
    data: {
      userId,
      projectId: file.projectId ?? null,
      filename: file.filename.slice(0, 180),
      mimeType,
      sizeBytes: file.bytes.byteLength,
      status: "ready",
      source: "user_upload",
      storageKey,
    },
  });

  return ok({ id: upload.id });
}

export async function getOwnedUpload(userId: string, uploadId: string) {
  return prisma.upload.findFirst({ where: { id: uploadId, userId } });
}

export async function readUploadBytes(storageKey: string): Promise<Buffer> {
  const object = await getPrivateStorage().getObject(storageKey);
  return Buffer.from(object.bytes);
}

export async function deleteUpload(
  userId: string,
  uploadId: string,
): Promise<ServiceResult<{ deleted: true }, "not_found">> {
  const upload = await getOwnedUpload(userId, uploadId);
  if (!upload) return err("not_found", "Upload not found.");

  await prisma.upload.delete({ where: { id: uploadId } });
  await getPrivateStorage().deleteObject(upload.storageKey);
  return ok({ deleted: true });
}
