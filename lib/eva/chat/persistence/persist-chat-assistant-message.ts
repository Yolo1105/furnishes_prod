import { prisma } from "@/lib/eva/db";

/**
 * Persists the assistant turn after streaming / finalization.
 */
export async function persistChatAssistantMessage(parameters: {
  conversationId: string;
  content: string;
}): Promise<void> {
  await prisma.message.create({
    data: {
      conversationId: parameters.conversationId,
      role: "assistant",
      content: parameters.content,
    },
  });
}
