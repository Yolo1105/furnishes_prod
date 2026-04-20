import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { getPublicOrigin } from "@/lib/eva/core/public-origin";

export const dynamic = "force-dynamic";

function generateShareId(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 12; i++) id += chars[bytes[i]! % chars.length]!;
  return id;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { error, status } = await requireConversationAccess(
    conversationId,
    req,
  );
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const shareId = generateShareId();
  const ttlRaw = process.env.SHARE_LINK_TTL_DAYS?.trim();
  const parsedTtl = ttlRaw ? parseInt(ttlRaw, 10) : 30;
  const ttlDays = Math.min(
    365,
    Math.max(1, Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 30),
  );
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.sharedProject.create({
    data: { conversationId, shareId, expiresAt },
  });
  const baseUrl = getPublicOrigin(req);
  const shareUrl = `${baseUrl}/shared/${shareId}`;
  return Response.json({ shareUrl });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const { error, status } = await requireConversationAccess(
    conversationId,
    req,
  );
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  await prisma.sharedProject.deleteMany({ where: { conversationId } });
  return Response.json({ ok: true });
}
