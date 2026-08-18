import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import { sendConversationMessage } from "./service";
import { setActiveAssistantPersona } from "./persona-service";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("conversation persona + preference integration", () => {
  let userId = "";
  let conversationId = "";

  beforeAll(async () => {
    process.env.CHAT_PROVIDER = "local";
    process.env.PREFERENCE_EXTRACTION_PROVIDER = "heuristic";
    process.env.CHAT_USER_DAILY_COST_LIMIT_USD = "0";
    process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
    process.env.CHAT_SESSION_COST_LIMIT_USD = "0";
    // Own user: this file mutates the active persona and consumes the
    // message-per-minute quota, both of which would leak across parallel files.
    userId = (
      await createTestUser("persona-prefs", {
        memoryEnabled: true,
        activeAssistantId: "eva-general",
      })
    ).id;
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `persona-prefs-${Date.now()}`,
        status: "active",
      },
    });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    await deleteTestUsers(userId);
  });

  it("loads persona server-side and stores assistantId", async () => {
    await prisma.preferenceProposal.deleteMany({
      where: { userId, status: "pending" },
    });
    await prisma.userPreference.deleteMany({ where: { userId } });
    await setActiveAssistantPersona(userId, "eva-style");
    const result = await sendConversationMessage(
      userId,
      conversationId,
      "I want a japandi bedroom with warm tones.",
      "typed",
      crypto.randomUUID(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.assistantMessage.assistantId).toBe("eva-style");
    expect(result.value.assistantMessage.content).toContain(
      "[local:eva-style]",
    );
    expect(result.value.preferenceProposals.length).toBeGreaterThan(0);

    const historicalId = result.value.assistantMessage.id;
    await setActiveAssistantPersona(userId, "eva-plan");
    const next = await sendConversationMessage(
      userId,
      conversationId,
      "What about circulation?",
      "typed",
      crypto.randomUUID(),
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.value.assistantMessage.assistantId).toBe("eva-plan");

    const historical = await prisma.message.findUnique({
      where: { id: historicalId },
    });
    expect(historical?.assistantId).toBe("eva-style");
  });

  it("room starters only propose room preferences", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `room-starter-${Date.now()}`,
        status: "active",
      },
    });
    const result = await sendConversationMessage(
      userId,
      conversation.id,
      "Help me plan my living room.",
      "room_starter",
      crypto.randomUUID(),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const proposal of result.value.preferenceProposals) {
      expect(proposal.category).toBe("room");
    }
  });
});
