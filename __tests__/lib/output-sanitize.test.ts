import { describe, it, expect } from "vitest";
import {
  finalizeAssistantOutput,
  lenientOutputGuards,
} from "@/lib/eva/core/output-sanitize";

describe("finalizeAssistantOutput", () => {
  it("returns strict sanitization when it preserves text", () => {
    const r = finalizeAssistantOutput("Hello, here is help for your room.");
    expect(r.text).toContain("Hello");
    expect(r.usedLenientFallback).toBe(false);
    expect(r.strictSanitizationCollapsed).toBe(false);
  });

  it("preserves prose when im_end markers are present", () => {
    const raw = "Hello\n<|redacted_im_end|>\nMore detail about the sofa.";
    const fin = finalizeAssistantOutput(raw);
    expect(fin.text.length).toBeGreaterThan(0);
    expect(fin.text).toContain("Hello");
  });

  it("lenientOutputGuards strips im_end without nuking surrounding prose", () => {
    const t = lenientOutputGuards(
      "Ideas for you.\n<|redacted_im_end|>\nNext steps.",
    );
    expect(t).toContain("Ideas");
    expect(t).toContain("Next");
    expect(t).not.toContain("<|im_end|>");
  });
});
