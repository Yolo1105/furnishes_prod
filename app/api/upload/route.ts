import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { log } from "@/lib/eva/core/logger";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  getUploadErrorMessageSize,
} from "@/lib/eva/upload-constants";

export const dynamic = "force-dynamic";

function isLocalDiskUploadDisabled(): boolean {
  const v = process.env.DISABLE_LOCAL_DISK_UPLOAD?.toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return apiError(
        "LOCAL_UPLOAD_FORBIDDEN",
        "Local disk upload is not available in production. Use POST /api/uploads/sign → PUT → POST /api/uploads/confirm (R2) only.",
        503,
      );
    }
    if (isLocalDiskUploadDisabled()) {
      return apiError(
        "LOCAL_UPLOAD_DISABLED",
        "Local filesystem upload is disabled. Use POST /api/uploads/sign, PUT to the presigned URL, then POST /api/uploads/confirm. Unset DISABLE_LOCAL_DISK_UPLOAD only for local development.",
        501,
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;
    if (!file || typeof file === "string") {
      return apiError(ErrorCodes.VALIDATION_ERROR, "No file provided", 400);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        getUploadErrorMessageSize(),
        400,
      );
    }
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        "Invalid type. Use JPEG, PNG, WebP, or GIF.",
        400,
      );
    }

    const cid = conversationId?.trim();
    if (cid) {
      const { error, status } = await requireConversationAccess(cid, req);
      if (error) {
        return apiError(
          status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
          error,
          status,
        );
      }
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const id = `${randomUUID()}.${ext}`;
    const filepath = path.join(/* turbopackIgnore: true */ UPLOAD_DIR, id);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/api/uploads/${id}`;
    if (cid) {
      await prisma.file.create({
        data: {
          conversationId: cid,
          filename: file.name,
          url,
          type: file.type,
        },
      });
    }
    return Response.json({ url, filename: file.name });
  } catch (e) {
    log({ level: "error", event: "upload_error", error: String(e) });
    return apiError(ErrorCodes.INTERNAL_ERROR, "Upload failed", 500);
  }
}
