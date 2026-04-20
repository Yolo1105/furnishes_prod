import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { apiError } from "@/lib/api/error";
import {
  signUploadUrl,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage/r2";
import { strictRateLimit, UPLOAD_SIGN_LIMITS } from "@/lib/rate-limit";
import { clientIdentity } from "@/lib/api/identity";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";

const BodySchema = z.object({
  prefix: z.enum(["uploads", "support-attachments", "avatars", "invoices"]),
  filename: z.string().min(1).max(255),
  mimeType: z.string().refine((m) => ALLOWED_MIME_TYPES.has(m), {
    message: "File type not allowed",
  }),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(
      MAX_UPLOAD_BYTES,
      `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`,
    ),
  /** Required for guest Eva chat when prefix is `uploads` and there is no session */
  conversationId: z.string().min(1).optional(),
});

/**
 * POST /api/uploads/sign
 *   body: { prefix, filename, mimeType, sizeBytes, conversationId? }
 *
 * - Signed-in users: presigned PUT for `uploads/<userId>/...` (or other prefixes).
 * - Guests: pass `conversationId` with prefix `uploads` — key is `uploads/guest/<conversationId>/...`
 *   after `requireConversationAccess`.
 */
export async function POST(req: NextRequest) {
  try {
    const input = BodySchema.parse(await req.json());

    const identity = clientIdentity(req);
    const limit = await strictRateLimit(identity, UPLOAD_SIGN_LIMITS);
    if (!limit.success) {
      return NextResponse.json(
        { error: "RATE_LIMIT", message: "Too many upload requests." },
        { status: 429 },
      );
    }

    const session = await auth();
    const userId = session?.user?.id ?? null;

    if (input.prefix !== "uploads") {
      if (!userId) {
        return NextResponse.json(
          { error: "UNAUTHORIZED", message: "Sign in to upload here." },
          { status: 401 },
        );
      }
      const result = await signUploadUrl({
        ...input,
        userId,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: "SIGN_FAILED", message: result.error },
          { status: 502 },
        );
      }
      return NextResponse.json(result.data);
    }

    // prefix === "uploads"
    if (userId) {
      const result = await signUploadUrl({
        ...input,
        userId,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: "SIGN_FAILED", message: result.error },
          { status: 502 },
        );
      }
      return NextResponse.json(result.data);
    }

    if (!input.conversationId) {
      return NextResponse.json(
        {
          error: "UNAUTHORIZED",
          message: "Sign in or pass conversationId for guest uploads.",
        },
        { status: 401 },
      );
    }

    const access = await requireConversationAccess(input.conversationId, req);
    if (access.error) {
      return NextResponse.json(
        {
          error: access.status === 404 ? "NOT_FOUND" : "FORBIDDEN",
          message: access.error,
        },
        { status: access.status },
      );
    }

    const result = await signUploadUrl({
      prefix: input.prefix,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      conversationId: input.conversationId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: "SIGN_FAILED", message: result.error },
        { status: 502 },
      );
    }

    return NextResponse.json(result.data);
  } catch (e) {
    return apiError(e);
  }
}
