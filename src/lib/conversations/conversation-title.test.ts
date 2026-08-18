import { describe, expect, it } from "vitest";
import {
  displayConversationTitle,
  needsGeneratedTitle,
  summarizeConversationTitle,
} from "./conversation-title";

describe("summarizeConversationTitle", () => {
  it("turns a first-line request into a short topic", () => {
    expect(
      summarizeConversationTitle(
        "I want to design a warm living room with oak floors and a linen sofa",
      ),
    ).toBe("Design a Warm Living Room with");
  });

  it("strips chat openers instead of recording the line", () => {
    expect(
      summarizeConversationTitle("Can you help me pick a kitchen palette?"),
    ).toBe("Pick a Kitchen Palette");
  });
});

describe("needsGeneratedTitle", () => {
  it("replaces defaults and first-line copies", () => {
    const line = "I need a rug for a 12 foot sofa";
    expect(needsGeneratedTitle("New conversation", line)).toBe(true);
    expect(needsGeneratedTitle(line, line)).toBe(true);
    expect(needsGeneratedTitle("Rug Scale", line)).toBe(false);
  });
});

describe("displayConversationTitle", () => {
  it("summarizes stored first-line titles in lists", () => {
    expect(
      displayConversationTitle(
        "Can you help me pick a kitchen palette?",
        "Can you help me pick a kitchen palette?",
      ),
    ).toBe("Pick a Kitchen Palette");
  });
});
