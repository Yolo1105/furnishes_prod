import { describe, expect, it } from "vitest";
import { hardenExtractedPreferenceCandidates } from "./preference-hardening";
import { classifyPreferenceMessageIntent } from "./preference-intent";
import { dropNegatedPreferenceCandidates } from "./preference-negation";
import { applyPreferenceFieldRouting } from "./preference-field-routing";
import { createHeuristicPreferenceExtractionProvider } from "./preference-extraction-heuristic";
import type { ExtractedPreferenceCandidate } from "./preference-types";

describe("preference extraction hardening", () => {
  const provider = createHeuristicPreferenceExtractionProvider();

  it("skips exploratory questions without preference cues", () => {
    expect(
      classifyPreferenceMessageIntent(
        "What do you recommend? Show me some options.",
      ),
    ).toBe("exploratory");
    const hardened = hardenExtractedPreferenceCandidates({
      content: "What do you recommend? Show me some options.",
      candidates: [
        {
          category: "style",
          value: "modern",
          confidence: 0.9,
        },
      ],
      currentPreferences: {},
    });
    expect(hardened).toEqual([]);
  });

  it("does not create proposals from pure negation", async () => {
    const raw = await provider.extract({
      content: "I do not like blue.",
      currentPreferences: {},
    });
    const hardened = hardenExtractedPreferenceCandidates({
      content: "I do not like blue.",
      candidates: raw,
      currentPreferences: {},
    });
    expect(hardened).toEqual([]);
  });

  it("drops negated color while keeping positive style", () => {
    const candidates: ExtractedPreferenceCandidate[] = [
      { category: "style", value: "japandi", confidence: 0.9 },
      { category: "color", value: "blue", confidence: 0.85 },
    ];
    const kept = dropNegatedPreferenceCandidates(
      candidates,
      "I want japandi but I do not like blue.",
    );
    expect(kept.map((item) => item.category)).toEqual(["style"]);
  });

  it("routes palette language away from style", () => {
    const routed = applyPreferenceFieldRouting([
      {
        category: "style",
        value: "warm beige",
        confidence: 0.8,
        evidenceText: "warm beige and terracotta",
      },
    ]);
    expect(routed[0]?.category).toBe("color");
  });

  it("keeps replacement proposals when style changes", async () => {
    const raw = await provider.extract({
      content: "I prefer maximalist now.",
      currentPreferences: { style: "minimalist" },
    });
    // Heuristic may not catch "maximalist" — inject candidate for contradiction path.
    const candidates =
      raw.length > 0
        ? raw
        : [
            {
              category: "style" as const,
              value: "maximalist",
              confidence: 0.88,
              evidenceText: "maximalist",
              evidenceStart: 9,
              evidenceEnd: 19,
            },
          ];
    const hardened = hardenExtractedPreferenceCandidates({
      content: "I prefer maximalist now.",
      candidates,
      currentPreferences: { style: "minimalist" },
    });
    expect(hardened.some((item) => item.category === "style")).toBe(true);
    expect(hardened.find((item) => item.category === "style")?.value).toMatch(
      /maximalist/i,
    );
  });

  it("reduces confidence for hedged language", () => {
    const hardened = hardenExtractedPreferenceCandidates({
      content: "Maybe I kind of want a coastal bedroom.",
      candidates: [
        {
          category: "style",
          value: "coastal",
          confidence: 0.9,
          evidenceText: "coastal",
          evidenceStart: 24,
          evidenceEnd: 31,
        },
        {
          category: "room",
          value: "bedroom",
          confidence: 0.9,
          evidenceText: "bedroom",
          evidenceStart: 32,
          evidenceEnd: 39,
        },
      ],
      currentPreferences: {},
    });
    expect(hardened.length).toBeGreaterThan(0);
    expect(hardened.every((item) => item.confidence < 0.9)).toBe(true);
  });

  it("rejects invalid evidence spans", () => {
    const hardened = hardenExtractedPreferenceCandidates({
      content: "I want a japandi living room.",
      candidates: [
        {
          category: "style",
          value: "japandi",
          confidence: 0.9,
          evidenceText: "not-in-message",
          evidenceStart: 0,
          evidenceEnd: 7,
        },
      ],
      currentPreferences: {},
    });
    expect(hardened[0]?.evidenceText).toBeUndefined();
    expect(hardened[0]!.confidence).toBeLessThanOrEqual(0.5);
  });
});
