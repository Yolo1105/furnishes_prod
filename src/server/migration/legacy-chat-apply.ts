import type { PrismaClient } from "@prisma/client";
import type { LegacyChatMigrationPlan } from "./legacy-chat-types";

type ApplyLegacyChatResult = {
  usersUpdated: number;
  conversationsUpserted: number;
  messagesUpserted: number;
  feedbackUpserted: number;
  preferencesUpserted: number;
};

/**
 * Apply a planned migration into the target database.
 * Idempotent on stable legacy ids for conversations/messages.
 */
export async function applyLegacyChatMigrationPlan(
  prisma: PrismaClient,
  plan: LegacyChatMigrationPlan,
): Promise<ApplyLegacyChatResult> {
  let usersUpdated = 0;
  let conversationsUpserted = 0;
  let messagesUpserted = 0;
  let feedbackUpserted = 0;
  let preferencesUpserted = 0;

  await prisma.$transaction(async (tx) => {
    for (const user of plan.users) {
      await tx.user.update({
        where: { id: user.targetUserId },
        data: { activeAssistantId: user.activeAssistantId },
      });
      usersUpdated += 1;
    }

    for (const conversation of plan.conversations) {
      await tx.conversation.upsert({
        where: { id: conversation.id },
        create: {
          id: conversation.id,
          userId: conversation.userId,
          title: conversation.title,
          status: conversation.status,
          projectId: conversation.projectId,
          createdAt: new Date(conversation.createdAt),
          updatedAt: new Date(conversation.updatedAt),
        },
        update: {
          userId: conversation.userId,
          title: conversation.title,
          status: conversation.status,
          projectId: conversation.projectId,
          updatedAt: new Date(conversation.updatedAt),
        },
      });
      conversationsUpserted += 1;
    }

    for (const message of plan.messages) {
      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId: message.conversationId,
          role: message.role,
          content: message.content,
          status: message.status,
          assistantId: message.assistantId,
          createdAt: new Date(message.createdAt),
        },
        update: {
          conversationId: message.conversationId,
          role: message.role,
          content: message.content,
          status: message.status,
          assistantId: message.assistantId,
        },
      });
      messagesUpserted += 1;
    }

    for (const feedback of plan.feedback) {
      await tx.messageFeedback.upsert({
        where: { messageId: feedback.messageId },
        create: {
          messageId: feedback.messageId,
          userId: feedback.userId,
          rating: feedback.rating,
        },
        update: {
          userId: feedback.userId,
          rating: feedback.rating,
        },
      });
      feedbackUpserted += 1;
    }

    for (const preference of plan.preferences) {
      await tx.userPreference.upsert({
        where: {
          userId_category: {
            userId: preference.userId,
            category: preference.category,
          },
        },
        create: {
          userId: preference.userId,
          category: preference.category,
          value: preference.value,
          confidence: preference.confidence,
          source: preference.source,
          sourceConversationId: preference.sourceConversationId,
        },
        update: {
          value: preference.value,
          confidence: preference.confidence,
          source: preference.source,
          sourceConversationId: preference.sourceConversationId,
        },
      });
      preferencesUpserted += 1;
    }
  });

  return {
    usersUpdated,
    conversationsUpserted,
    messagesUpserted,
    feedbackUpserted,
    preferencesUpserted,
  };
}

type VerifyLegacyChatResult = {
  ok: boolean;
  expected: Record<string, number>;
  actual: Record<string, number>;
  mismatches: string[];
};

export async function verifyLegacyChatMigration(
  prisma: PrismaClient,
  plan: LegacyChatMigrationPlan,
): Promise<VerifyLegacyChatResult> {
  const conversationIds = plan.conversations.map((row) => row.id);
  const messageIds = plan.messages.map((row) => row.id);

  const [conversations, messages, feedback] = await Promise.all([
    prisma.conversation.count({
      where: { id: { in: conversationIds } },
    }),
    prisma.message.count({ where: { id: { in: messageIds } } }),
    prisma.messageFeedback.count({
      where: { messageId: { in: plan.feedback.map((row) => row.messageId) } },
    }),
  ]);

  let preferences = 0;
  for (const preference of plan.preferences) {
    const row = await prisma.userPreference.findUnique({
      where: {
        userId_category: {
          userId: preference.userId,
          category: preference.category,
        },
      },
    });
    if (row) preferences += 1;
  }

  const expected = {
    conversations: plan.conversations.length,
    messages: plan.messages.length,
    feedback: plan.feedback.length,
    preferences: plan.preferences.length,
  };
  const actual = {
    conversations,
    messages,
    feedback,
    preferences,
  };
  const mismatches: string[] = [];
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (expected[key] !== actual[key]) {
      mismatches.push(
        `${key}: expected ${expected[key]}, actual ${actual[key]}`,
      );
    }
  }

  return { ok: mismatches.length === 0, expected, actual, mismatches };
}
