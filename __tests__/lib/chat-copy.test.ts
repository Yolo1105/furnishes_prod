import { describe, it, expect } from "vitest";
import {
  isAssistantFailureDisplayContent,
  CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED,
  CHAT_FAILURE_LEGACY_EMPTY_REPLY,
} from "@/lib/eva/core/chat-copy";

describe("chat-copy failure detection", () => {
  it("recognizes current terminal failure copy", () => {
    expect(
      isAssistantFailureDisplayContent(CHAT_FAILURE_ALL_RECOVERY_EXHAUSTED),
    ).toBe(true);
  });

  it("recognizes legacy empty-reply string for older sessions", () => {
    expect(
      isAssistantFailureDisplayContent(CHAT_FAILURE_LEGACY_EMPTY_REPLY),
    ).toBe(true);
  });

  it("does not flag normal assistant text", () => {
    expect(
      isAssistantFailureDisplayContent("Try a warm neutral palette."),
    ).toBe(false);
  });

  it("matches infrastructure substrings", () => {
    expect(
      isAssistantFailureDisplayContent("Something went wrong (500)."),
    ).toBe(true);
  });
});
