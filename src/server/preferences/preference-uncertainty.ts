type UncertaintyLevel =
  "none" | "hedged" | "conditional" | "tentative" | "exploratory";

const EXPLORATORY =
  /\b(?:i\s+)?(?:don'?t|do\s+not)\s+know\b|\b(?:not|no)\s+sure\b|\b(?:what|how)\s+do\s+you\s+think\b|\b(?:show|give)\s+me\s+(?:options|ideas)\b/i;

const TENTATIVE =
  /\bmaybe\b|\b(?:possibly|perhaps|might|could)\s+(?:be|want|prefer|like)\b|\b(?:i'?m|i\s+am)\s+(?:thinking|considering)\b|\bwhat\s+about\b|\bi\s+might\b/i;

const CONDITIONAL =
  /\bif\s+(?:we|i|it|that)\b|\bdepending\s+on\b|\bassuming\b/i;

const HEDGED = /\b(?:kind of|sort of|a bit|a little|somewhat|rather)\b/i;

export function detectPreferenceUncertainty(message: string): {
  level: UncertaintyLevel;
  adjustment: number;
} {
  if (EXPLORATORY.test(message)) {
    return { level: "exploratory", adjustment: -1 };
  }
  if (TENTATIVE.test(message)) {
    return { level: "tentative", adjustment: -0.4 };
  }
  if (CONDITIONAL.test(message)) {
    return { level: "conditional", adjustment: -0.3 };
  }
  if (HEDGED.test(message)) {
    return { level: "hedged", adjustment: -0.2 };
  }
  return { level: "none", adjustment: 0 };
}

export function adjustConfidenceForUncertainty(
  base: number,
  adjustment: number,
): number {
  if (adjustment <= -1) return 0;
  const next = base + adjustment;
  if (next < 0.1) return 0.1;
  if (next > 1) return 1;
  return Math.round(next * 100) / 100;
}
