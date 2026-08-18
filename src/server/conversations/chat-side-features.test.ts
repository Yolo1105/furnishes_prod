import { beforeEach, describe, expect, it, vi } from "vitest";
import { CHAT_FAILURE_COST_LIMIT } from "./chat-copy";

vi.mock("@/server/db", () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/conversations/chat-rate-limit", () => ({
  assertChatSendAllowed: vi.fn(async () => ({ ok: true, value: undefined })),
}));

vi.mock("@/server/preferences/preference-service", () => ({
  getConfirmedPreferenceMap: vi.fn(async () => ({
    room: null,
    budget: null,
    style: null,
    color: null,
    furniture: null,
  })),
}));

vi.mock("@/lib/eva/personas/catalog", () => ({
  getAssistantPersonaById: vi.fn(() => ({
    id: "eva-general",
    name: "Eva",
    focus: "general",
  })),
  normalizeAssistantPersonaId: vi.fn((id: string) => id),
}));

vi.mock("@/lib/eva/personas/prompt", () => ({
  mergeAssistantIntoSystemPrompt: vi.fn((base: string) => base),
}));

const generateStructured = vi.fn();

vi.mock("@/server/structured-output/generate-structured", () => {
  class CostLimitError extends Error {
    code = "cost_limit" as const;
    constructor(message = "Cost limit exceeded") {
      super(message);
      this.name = "CostLimitError";
    }
  }
  return {
    CostLimitError,
    generateStructured: (...args: unknown[]) => generateStructured(...args),
  };
});

import { prisma } from "@/server/db";
import { CostLimitError } from "@/server/structured-output/generate-structured";
import {
  generateConversationBrainstorm,
  generateConversationSuggestions,
} from "./chat-side-features";

describe("chat-side-features cost caps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAT_SIDE_FEATURES_ENABLED = "1";
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({
      id: "c1",
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeAssistantId: "eva-general",
      memoryEnabled: false,
    } as never);
  });

  it("surfaces cost_limit for suggestions", async () => {
    generateStructured.mockRejectedValueOnce(new CostLimitError());
    const result = await generateConversationSuggestions({
      userId: "u1",
      conversationId: "c1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("cost_limit");
      expect(result.message).toBe(CHAT_FAILURE_COST_LIMIT);
    }
  });

  it("surfaces cost_limit for brainstorm", async () => {
    generateStructured.mockRejectedValueOnce(new CostLimitError());
    const result = await generateConversationBrainstorm({
      userId: "u1",
      conversationId: "c1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("cost_limit");
      expect(result.message).toBe(CHAT_FAILURE_COST_LIMIT);
    }
  });

  it("disables suggestions and brainstorm in copilot mode", async () => {
    process.env.CHAT_COPILOT_MODE_ENABLED = "1";
    const suggestions = await generateConversationSuggestions({
      userId: "u1",
      conversationId: "c1",
      mode: "copilot",
    });
    expect(suggestions.ok).toBe(false);
    if (!suggestions.ok) expect(suggestions.error).toBe("disabled");

    const brainstorm = await generateConversationBrainstorm({
      userId: "u1",
      conversationId: "c1",
      mode: "copilot",
    });
    expect(brainstorm.ok).toBe(false);
    if (!brainstorm.ok) expect(brainstorm.error).toBe("disabled");
  });
});
