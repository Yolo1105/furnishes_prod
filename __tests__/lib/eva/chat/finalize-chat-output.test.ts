import { describe, expect, it } from "vitest";
import { finalizeAssistantOutput } from "@/lib/eva/core/output-sanitize";
import { finalizeChatModelOutput } from "@/lib/eva/chat/generation/finalize-chat-output";

describe("finalizeChatModelOutput", () => {
  it("preserves non-empty sanitized output", () => {
    const result = finalizeChatModelOutput("Hello — welcome.");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.sanitizeCollapsedToEmpty).toBe(false);
  });

  it("stays aligned with finalizeAssistantOutput and exposes length fields", () => {
    const raw = "Normal assistant reply about a sofa layout.";
    const base = finalizeAssistantOutput(raw);
    const wrapped = finalizeChatModelOutput(raw);
    expect(wrapped.text).toBe(base.text);
    expect(wrapped.rawLength).toBe(raw.length);
    expect(wrapped.finalizedLength).toBe(wrapped.text.length);
    expect(wrapped.sanitizeCollapsedToEmpty).toBe(
      raw.trim().length > 0 && wrapped.text.trim().length === 0,
    );
  });
});
