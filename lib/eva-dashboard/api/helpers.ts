/**
 * Shared server helpers for API routes.
 */
import type { PrismaClient } from "@prisma/client";

/** Format messages as "role: content" lines for LLM context. */
export function messagesToTranscript(
  messages: { role: string; content: string }[],
): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join("\n");
}

/** Load preferences for a conversation as Record<field, value>. */
export async function getPreferencesAsRecord(
  prismaInstance: PrismaClient,
  conversationId: string,
): Promise<Record<string, string>> {
  const prefs = await prismaInstance.preference.findMany({
    where: { conversationId },
  });
  return prefs.reduce<Record<string, string>>(
    (acc: Record<string, string>, p: { field: string; value: string }) => {
      acc[p.field] = p.value;
      return acc;
    },
    {},
  );
}
