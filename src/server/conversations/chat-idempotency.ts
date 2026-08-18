import { prisma } from "@/server/db";

export const CHAT_GENERATION_STATUS = {
  pending: "pending",
  complete: "complete",
  failed: "failed",
} as const;

const CLIENT_MESSAGE_ID_MAX = 128;

/** Validate browser idempotency key (UUID or opaque token, max 128). */
export function isValidClientMessageId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > CLIENT_MESSAGE_ID_MAX) return false;
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

export async function findUserMessageByClientId(
  conversationId: string,
  clientMessageId: string,
) {
  return prisma.message.findFirst({
    where: {
      conversationId,
      clientMessageId,
      role: "user",
    },
    include: {
      generationAsUserMessage: {
        include: {
          assistantMessage: true,
        },
      },
    },
  });
}
