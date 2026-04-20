import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { CONTENT_TYPES, UPLOAD_DIR } from "@/lib/eva/upload-constants";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Bad request", 400);
  }

  // Prefer DB id match; fall back to storage key in url (legacy local uploads).
  const fileRow =
    (await prisma.file.findUnique({
      where: { id },
      select: { conversationId: true },
    })) ??
    (await prisma.file.findFirst({
      where: { url: { endsWith: `/${id}` } },
      select: { conversationId: true },
    }));
  if (!fileRow) {
    return apiError(ErrorCodes.NOT_FOUND, "Upload not found", 404);
  }

  const { error, status } = await requireConversationAccess(
    fileRow.conversationId,
    req,
  );
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }

  const resolvedDir = path.resolve(UPLOAD_DIR);
  const filepath = path.resolve(UPLOAD_DIR, id);
  if (
    filepath !== resolvedDir &&
    !filepath.startsWith(resolvedDir + path.sep)
  ) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Bad request", 400);
  }
  try {
    const buffer = await readFile(filepath);
    const ext = id.split(".").pop()?.toLowerCase() || "";
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return apiError(ErrorCodes.NOT_FOUND, "Upload not found", 404);
  }
}
