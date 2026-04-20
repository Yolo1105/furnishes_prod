import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import {
  verifyUpload,
  getObjectFirstBytes,
  publicUrlForStorageKey,
  r2IsConfigured,
  ALLOWED_MIME_TYPES,
} from "@/lib/storage/r2";
import {
  filenameConsistentWithMime,
  mimeMatchesDeclaredContent,
} from "@/lib/upload/buffer-mime";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  storageKey: z
    .string()
    .min(3)
    .max(512)
    .refine((k) => k.startsWith("uploads/"), {
      message: "Invalid storage key",
    }),
  conversationId: z.string().min(1),
  filename: z.string().min(1).max(255),
});

/**
 * POST /api/uploads/confirm
 *
 * After the browser PUTs a file to the presigned URL from POST /api/uploads/sign,
 * call this to HEAD-verify the object in R2 and create the `File` row.
 */
export async function POST(req: Request) {
  if (!r2IsConfigured) {
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      "Object storage is not configured.",
      503,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Invalid JSON body", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request",
      400,
      parsed.error.flatten(),
    );
  }

  const { storageKey, conversationId, filename } = parsed.data;

  const access = await requireConversationAccess(conversationId, req);
  if (access.error) {
    return apiError(
      access.status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      access.error,
      access.status,
    );
  }

  const verified = await verifyUpload(storageKey);
  if (!verified.ok) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      verified.error || "Upload not found in storage",
      400,
    );
  }

  if (!ALLOWED_MIME_TYPES.has(verified.mimeType)) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "File type not allowed", 400);
  }

  if (!filenameConsistentWithMime(filename, verified.mimeType)) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Filename extension does not match declared file type",
      400,
    );
  }

  const head = await getObjectFirstBytes(storageKey, 512);
  if (!head) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      "Could not read uploaded object for verification",
      400,
    );
  }
  const sniff = mimeMatchesDeclaredContent(head, verified.mimeType);
  if (!sniff.ok) {
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      `Content does not match declared type: ${sniff.reason}`,
      400,
    );
  }

  const url = publicUrlForStorageKey(storageKey);
  if (!url) {
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      "R2_PUBLIC_URL is not set; cannot build a public file URL.",
      503,
    );
  }

  const file = await prisma.file.create({
    data: {
      conversationId,
      filename,
      url,
      type: verified.mimeType,
    },
  });

  return Response.json({
    id: file.id,
    url: file.url,
    filename: file.filename,
    storageKey,
  });
}
