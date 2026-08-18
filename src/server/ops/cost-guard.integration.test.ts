import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import { sendConversationMessage } from "@/server/conversations/service";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("cost-guard pipeline integration", () => {
  let userId = "";

  beforeAll(async () => {
    process.env.CHAT_PROVIDER = "local";
    process.env.PREFERENCE_EXTRACTION_PROVIDER = "heuristic";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    process.env.CHAT_USER_DAILY_COST_LIMIT_USD = "0";
    process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
    // Own user so a shared message-per-minute quota cannot surface as
    // rate_limited where this test asserts cost_limit.
    userId = (await createTestUser("cost-guard")).id;
  });

  afterAll(async () => {
    await deleteTestUsers(userId);
  });

  it("refuses generation when conversation CostLog is over session cap", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `cost-cap-${Date.now()}`,
        status: "active",
      },
    });

    await prisma.costLog.create({
      data: {
        userId,
        conversationId: conversation.id,
        model: "gpt-4o-mini",
        kind: "chat",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        costUsd: 2.5,
      },
    });

    const result = await sendConversationMessage(
      userId,
      conversation.id,
      "Help me plan a calm living room.",
      "typed",
      crypto.randomUUID(),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("cost_limit");
    expect(result.message).toMatch(/usage limit/i);
  });
});
