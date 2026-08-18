/**
 * Anonymous conversation share links.
 * Re-derived from legacy SharedProject + /api/conversations/[id]/share.
 *
 * Product defaults (documented):
 * - SHARE_LINK_TTL_DAYS default 7 (clamp 1–365)
 * - Anonymous payload: title + messages only (no preference values)
 * - Flag CHAT_SHARE_ENABLED=0
 */

import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";

const SHARE_ID_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function isChatShareEnabled(): boolean {
  return process.env.CHAT_SHARE_ENABLED === "1";
}

export function shareLinkTtlDays(): number {
  const raw = Number(process.env.SHARE_LINK_TTL_DAYS ?? "7");
  if (!Number.isFinite(raw) || raw < 1) return 7;
  return Math.min(365, Math.floor(raw));
}

export function generateShareId(
  randomBytes: (size: number) => Uint8Array = (size) =>
    crypto.getRandomValues(new Uint8Array(size)),
): string {
  // Rejection sampling: 256 % 62 ≠ 0, so discard bytes ≥ 248 (= 62 * 4).
  const alphabet = SHARE_ID_CHARS.length;
  const limit = Math.floor(256 / alphabet) * alphabet;
  let id = "";
  while (id.length < 12) {
    const bytes = randomBytes(16);
    for (let i = 0; i < bytes.length; i += 1) {
      const value = bytes[i]!;
      if (value >= limit) continue;
      id += SHARE_ID_CHARS[value % alphabet]!;
      if (id.length >= 12) break;
    }
  }
  return id;
}

function publicOrigin(request: Request): string {
  const envOrigin =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");
  const url = new URL(request.url);
  return url.origin;
}

type SharedConversationPayload = {
  shareId: string;
  title: string;
  messages: Array<{ role: string; content: string; createdAt: string }>;
  expiresAt: string | null;
};

export async function createConversationShare(input: {
  userId: string;
  conversationId: string;
  request: Request;
}): Promise<
  ServiceResult<
    { shareUrl: string; shareId: string; expiresAt: string },
    "not_found" | "disabled"
  >
> {
  if (!isChatShareEnabled()) {
    return err("disabled", "Conversation sharing is disabled.");
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: { id: true },
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  const shareId = generateShareId();
  const expiresAt = new Date(
    Date.now() + shareLinkTtlDays() * 24 * 60 * 60 * 1000,
  );

  await prisma.sharedProject.create({
    data: {
      conversationId: input.conversationId,
      shareId,
      expiresAt,
    },
  });

  const shareUrl = `${publicOrigin(input.request)}/shared/${shareId}`;
  return ok({
    shareUrl,
    shareId,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function revokeConversationShare(input: {
  userId: string;
  conversationId: string;
}): Promise<ServiceResult<{ ok: true }, "not_found" | "disabled">> {
  if (!isChatShareEnabled()) {
    return err("disabled", "Conversation sharing is disabled.");
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: { id: true },
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  await prisma.sharedProject.deleteMany({
    where: { conversationId: input.conversationId },
  });
  return ok({ ok: true });
}

export async function getSharedConversation(
  shareId: string,
): Promise<ServiceResult<SharedConversationPayload, "not_found">> {
  const shared = await prisma.sharedProject.findUnique({
    where: { shareId },
    include: {
      conversation: {
        select: {
          title: true,
          messages: {
            orderBy: { createdAt: "asc" },
            take: 200,
            select: { role: true, content: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!shared) return err("not_found", "Share link not found.");
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return err("not_found", "Share link expired.");
  }

  return ok({
    shareId: shared.shareId,
    title: shared.conversation.title || "Shared conversation",
    messages: shared.conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
    expiresAt: shared.expiresAt?.toISOString() ?? null,
  });
}
