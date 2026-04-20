import { describe, expect, it } from "vitest";
import {
  classifyMessageIntent,
  MessageIntent,
} from "@/lib/eva/extraction/classifier";
import { shouldRejectGenericPreferenceValue } from "@/lib/eva/extraction/topic-labels";

describe("classifyMessageIntent exploratory topics", () => {
  it("treats Color palette as exploratory, not direct preference", () => {
    const { intent } = classifyMessageIntent("Color palette");
    expect(intent).toBe(MessageIntent.EXPLORATORY);
  });

  it("still treats explicit color statements as direct preference", () => {
    const { intent } = classifyMessageIntent(
      "I want warm neutrals and soft beige",
    );
    expect(intent).toBe(MessageIntent.DIRECT_PREFERENCE);
  });

  it("treats questions as QUESTION unless they state explicit preferences", () => {
    const { intent } = classifyMessageIntent(
      "What paint colors work with oak floors?",
    );
    expect(intent).toBe(MessageIntent.QUESTION);
  });
});

describe("shouldRejectGenericPreferenceValue", () => {
  it("rejects color palette as a stored color value", () => {
    expect(
      shouldRejectGenericPreferenceValue(
        "color",
        "Color palette",
        "Color palette",
      ),
    ).toBe(true);
  });

  it("keeps concrete palette descriptions", () => {
    expect(
      shouldRejectGenericPreferenceValue(
        "color",
        "soft sage and warm white",
        "I prefer soft sage and warm white",
      ),
    ).toBe(false);
  });
});
