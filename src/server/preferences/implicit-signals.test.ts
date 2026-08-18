import { describe, expect, it } from "vitest";
import {
  detectImplicitSignals,
  PREFERENCE_EXPRESSING,
} from "./implicit-signals";
import { emptyPreferenceMap } from "./preference-types";

describe("PREFERENCE_EXPRESSING", () => {
  it("matches preference-expressing phrases", () => {
    expect(PREFERENCE_EXPRESSING.test("I want a modern sofa")).toBe(true);
    expect(PREFERENCE_EXPRESSING.test("I saw a modern art exhibit")).toBe(
      false,
    );
  });
});

describe("detectImplicitSignals", () => {
  const confirmed = {
    ...emptyPreferenceMap(),
    style: "japandi",
    color: "warm beige",
  };

  it("detects restate of confirmed preference", () => {
    const signals = detectImplicitSignals({
      message: "I really want japandi style for this room.",
      confirmedPreferences: confirmed,
    });
    expect(signals).toContainEqual({
      type: "restate_preference",
      category: "style",
    });
  });

  it("detects restate of pending proposal", () => {
    const signals = detectImplicitSignals({
      message: "I'd prefer navy blue accents on the walls.",
      confirmedPreferences: emptyPreferenceMap(),
      pendingProposals: [{ category: "color", proposedValue: "navy blue" }],
    });
    expect(signals).toContainEqual({
      type: "restate_pending_proposal",
      category: "color",
    });
  });

  it("detects preference removal language", () => {
    const signals = detectImplicitSignals({
      message: "Please remove warm beige from the palette.",
      confirmedPreferences: confirmed,
    });
    expect(signals).toContainEqual({
      type: "preference_removal",
      category: "color",
    });
  });

  it("does not treat modern art exhibit mention as preference restate", () => {
    const withModern = {
      ...emptyPreferenceMap(),
      style: "modern",
    };
    const signals = detectImplicitSignals({
      message: "I saw a modern art exhibit downtown yesterday.",
      confirmedPreferences: withModern,
    });
    expect(signals.some((signal) => signal.type === "restate_preference")).toBe(
      false,
    );
  });

  it("detects style change shortly after a recommendation", () => {
    const signals = detectImplicitSignals({
      message: "Actually I want a more modern look instead.",
      confirmedPreferences: emptyPreferenceMap(),
      recentRecommendationAt: new Date(),
      messageIndex: 3,
    });
    expect(signals).toContainEqual({
      type: "style_change_after_rec",
      category: "style",
    });
  });

  it("skips style_change_after_rec when message index is outside scope", () => {
    const signals = detectImplicitSignals({
      message: "Let's revisit the modern direction.",
      confirmedPreferences: emptyPreferenceMap(),
      recentRecommendationAt: new Date(),
      messageIndex: 10,
    });
    expect(
      signals.some((signal) => signal.type === "style_change_after_rec"),
    ).toBe(false);
  });
});

describe("isChatImplicitSignalsEnabled", () => {
  it("is off unless CHAT_IMPLICIT_SIGNALS_ENABLED=1", async () => {
    delete process.env.CHAT_IMPLICIT_SIGNALS_ENABLED;
    const { isChatImplicitSignalsEnabled } = await import("./implicit-signals");
    expect(isChatImplicitSignalsEnabled()).toBe(false);
    process.env.CHAT_IMPLICIT_SIGNALS_ENABLED = "1";
    expect(isChatImplicitSignalsEnabled()).toBe(true);
  });
});
