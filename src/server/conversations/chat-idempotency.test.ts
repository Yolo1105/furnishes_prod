import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import { sendConversationMessage } from "./service";
import { CHAT_GENERATION_STATUS } from "./chat-idempotency";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("conversation message idempotency", () => {
  let userId = "";

  beforeAll(async () => {
    process.env.CHAT_PROVIDER = "local";
    process.env.PREFERENCE_EXTRACTION_PROVIDER = "heuristic";
    process.env.CHAT_USER_DAILY_COST_LIMIT_USD = "0";
    process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "0";
    // Own user: the message-per-minute quota counts rows, so sharing the seeded
    // owner lets parallel files exhaust this file's allowance.
    userId = (await createTestUser("chat-idempotency")).id;
  });

  afterAll(async () => {
    await deleteTestUsers(userId);
  });

  it("returns the same result for a duplicate clientMessageId", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `idempotent-${Date.now()}`,
        status: "active",
      },
    });
    const clientMessageId = crypto.randomUUID();
    const first = await sendConversationMessage(
      userId,
      conversation.id,
      "Help me plan a calm living room.",
      "typed",
      clientMessageId,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await sendConversationMessage(
      userId,
      conversation.id,
      "Help me plan a calm living room.",
      "typed",
      clientMessageId,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.value.userMessage.id).toBe(first.value.userMessage.id);
    expect(second.value.assistantMessage.id).toBe(
      first.value.assistantMessage.id,
    );

    const userMessages = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        role: "user",
        clientMessageId,
      },
    });
    expect(userMessages).toBe(1);

    const generations = await prisma.chatGeneration.count({
      where: { conversationId: conversation.id },
    });
    expect(generations).toBe(1);
  });

  it("rejects a second concurrent send while generation is pending", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `busy-${Date.now()}`,
        status: "active",
      },
    });
    const blocker = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: "Blocking generation",
        status: "complete",
        clientMessageId: crypto.randomUUID(),
      },
    });
    await prisma.chatGeneration.create({
      data: {
        conversationId: conversation.id,
        userMessageId: blocker.id,
        provider: "local",
        status: CHAT_GENERATION_STATUS.pending,
      },
    });

    const result = await sendConversationMessage(
      userId,
      conversation.id,
      "Another message while busy.",
      "typed",
      crypto.randomUUID(),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("generation_in_progress");
  });

  it("requires clientMessageId", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `missing-id-${Date.now()}`,
        status: "active",
      },
    });
    const result = await sendConversationMessage(
      userId,
      conversation.id,
      "Hello without id.",
      "typed",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("validation");
  });
});
