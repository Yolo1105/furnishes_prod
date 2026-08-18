import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  createTestUser,
  deleteTestUsers,
} from "@/server/test-support/db-fixtures";
import {
  acceptPreferenceProposal,
  createPendingProposalsFromExtraction,
  getConfirmedPreferenceMap,
  rejectPreferenceProposal,
  removeManualPreference,
  setManualPreference,
  undoAcceptedPreferenceProposal,
} from "./preference-service";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("preference service decisions", () => {
  let userId = "";
  let strangerId = "";
  let conversationId = "";

  beforeAll(async () => {
    process.env.PREFERENCE_EXTRACTION_PROVIDER = "heuristic";
    // Own users: this file deletes and rewrites the user's preference rows,
    // which other files running in parallel also read.
    userId = (await createTestUser("pref-owner", { memoryEnabled: true })).id;
    strangerId = (await createTestUser("pref-stranger")).id;
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: `pref-service-${Date.now()}`,
        status: "active",
      },
    });
    conversationId = conversation.id;
  });

  afterAll(async () => {
    await deleteTestUsers(userId, strangerId);
  });

  it("manual set and remove persist immediately", async () => {
    const set = await setManualPreference({
      userId,
      category: "color",
      value: "navy",
      sourceConversationId: conversationId,
    });
    expect(set.ok).toBe(true);
    const map = await getConfirmedPreferenceMap(userId);
    expect(map.color).toBe("navy");

    const removed = await removeManualPreference(userId, "color");
    expect(removed.ok).toBe(true);
    const after = await getConfirmedPreferenceMap(userId);
    expect(after.color).toBeNull();
  });

  it("accept, edit-accept, reject, and undo work safely", async () => {
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: "I prefer modern style and a sofa.",
        status: "complete",
      },
    });
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: "Noted.",
        status: "complete",
        assistantId: "eva-general",
      },
    });

    const proposals = await createPendingProposalsFromExtraction({
      userId,
      conversationId,
      sourceMessageId: userMessage.id,
      displayMessageId: assistantMessage.id,
      memoryEnabled: true,
      messageSource: "typed",
      content: "I prefer modern style under $4000 with a sofa.",
      currentPreferences: await getConfirmedPreferenceMap(userId),
    });
    expect(proposals.length).toBeGreaterThan(0);

    const style = proposals.find((item) => item.category === "style");
    expect(style).toBeTruthy();
    if (!style) return;

    const accepted = await acceptPreferenceProposal({
      userId,
      proposalId: style.id,
      value: "contemporary",
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.preference.value).toBe("contemporary");

    const strangerAccept = await acceptPreferenceProposal({
      userId: strangerId,
      proposalId: style.id,
    });
    expect(strangerAccept.ok).toBe(false);

    const undone = await undoAcceptedPreferenceProposal({
      userId,
      proposalId: style.id,
    });
    expect(undone.ok).toBe(true);

    const budget = proposals.find((item) => item.category === "budget");
    if (budget) {
      const rejected = await rejectPreferenceProposal({
        userId,
        proposalId: budget.id,
      });
      expect(rejected.ok).toBe(true);
      if (rejected.ok) {
        expect(rejected.value.status).toBe("rejected");
      }
    }
  });

  it("skips extraction for quick suggestions and memory-off", async () => {
    const userMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: "Color palette",
        status: "complete",
      },
    });
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: "ok",
        status: "complete",
        assistantId: "eva-general",
      },
    });

    const quick = await createPendingProposalsFromExtraction({
      userId,
      conversationId,
      sourceMessageId: userMessage.id,
      displayMessageId: assistantMessage.id,
      memoryEnabled: true,
      messageSource: "quick_suggestion",
      content: "I love japandi bedrooms under $2000",
      currentPreferences: await getConfirmedPreferenceMap(userId),
    });
    expect(quick).toEqual([]);

    const disabled = await createPendingProposalsFromExtraction({
      userId,
      conversationId,
      sourceMessageId: userMessage.id,
      displayMessageId: assistantMessage.id,
      memoryEnabled: false,
      messageSource: "typed",
      content: "I love japandi bedrooms under $2000",
      currentPreferences: await getConfirmedPreferenceMap(userId),
    });
    expect(disabled).toEqual([]);
  });
});
