import { describe, expect, it, vi, beforeEach } from "vitest";
import { persistChatAssistantMessage } from "@/lib/eva/chat/persistence/persist-chat-assistant-message";

const { create } = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/eva/db", () => ({
  prisma: {
    message: { create },
  },
}));

describe("persistChatAssistantMessage", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: "m1" });
  });

  it("persists assistant role and content only", async () => {
    await persistChatAssistantMessage({
      conversationId: "conv-1",
      content: "Hello from Eva.",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        conversationId: "conv-1",
        role: "assistant",
        content: "Hello from Eva.",
      },
    });
  });
});
