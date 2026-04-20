/**
 * Uncertainty detection and confidence adjustment for tentative preferences.
 * Ported from V1 uncertainty_handler.py.
 */

export enum UncertaintyLevel {
  /** "I don't know", "what do you think?" — no preference expressed */
  EXPLORATORY = "exploratory",
  /** "maybe X?", "possibly X", "I'm thinking X" */
  TENTATIVE = "tentative",
  /** "X if Y", "X but only if" */
  CONDITIONAL = "conditional",
  /** "kind of X", "sort of X", "a bit X" */
  HEDGED = "hedged",
}

export type DetectUncertaintyResult = {
  hasUncertainty: boolean;
  level: UncertaintyLevel | null;
  confidenceAdjustment: number;
};

const EXPLORATORY_PATTERNS = [
  /\b(?:i\s+)?(?:don'?t|do not)\s+know/,
  /\b(?:not|no)\s+sure/,
  /\b(?:what|how)\s+do\s+you\s+think/,
  /\b(?:what|which)\s+(?:do|would)\s+you\s+(?:recommend|suggest)/,
  /\b(?:show|give)\s+me\s+(?:options|ideas|suggestions)/,
  /\b(?:i'?m|i am)\s+(?:open|flexible)\s+to\s+(?:anything|options)/,
];

const TENTATIVE_PATTERNS = [
  /\bmaybe\s+([a-z\s]+?)(?:\s|$|,|\.|\?)/,
  /\b(?:possibly|perhaps|might|could)\s+be\s+([a-z\s]+?)(?:\s|$|,|\.)/,
  /\b(?:i'?m|i am)\s+thinking\s+(?:about\s+)?([a-z\s]+?)(?:\s|$|,|\.)/,
  /\b(?:i'?m|i am)\s+considering\s+([a-z\s]+?)(?:\s|$|,|\.)/,
  /\b(?:not|no)\s+sure\s+(?:but|if)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
  /\b(?:what|how)\s+about\s+([a-z\s]+?)(?:\s|$|,|\.|\?)/,
];

const CONDITIONAL_PATTERNS = [
  /\b([a-z\s]+?)\s+(?:but|if|only if|as long as)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
  /\b([a-z\s]+?)\s+(?:would be|could be)\s+(?:nice|good|fine)\s+(?:if|but|as long as)/,
];

const HEDGED_PATTERNS = [
  /\b(?:kind of|sort of|a bit|a little|somewhat|rather)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
  /\b(?:maybe|perhaps)\s+(?:a\s+)?(?:bit|little)\s+([a-z\s]+?)(?:\s|$|,|\.)/,
];

/**
 * Detect uncertainty markers in message.
 * Returns hasUncertainty, level, and confidence adjustment.
 * EXPLORATORY => -1.0 (don't extract), TENTATIVE => -0.4, CONDITIONAL => -0.3, HEDGED => -0.2.
 */
export function detectUncertainty(message: string): DetectUncertaintyResult {
  const lower = message.toLowerCase();

  for (const pat of EXPLORATORY_PATTERNS) {
    if (pat.test(lower))
      return {
        hasUncertainty: true,
        level: UncertaintyLevel.EXPLORATORY,
        confidenceAdjustment: -1.0,
      };
  }
  for (const pat of TENTATIVE_PATTERNS) {
    if (pat.test(lower))
      return {
        hasUncertainty: true,
        level: UncertaintyLevel.TENTATIVE,
        confidenceAdjustment: -0.4,
      };
  }
  for (const pat of CONDITIONAL_PATTERNS) {
    if (pat.test(lower))
      return {
        hasUncertainty: true,
        level: UncertaintyLevel.CONDITIONAL,
        confidenceAdjustment: -0.3,
      };
  }
  for (const pat of HEDGED_PATTERNS) {
    if (pat.test(lower))
      return {
        hasUncertainty: true,
        level: UncertaintyLevel.HEDGED,
        confidenceAdjustment: -0.2,
      };
  }

  return { hasUncertainty: false, level: null, confidenceAdjustment: 0 };
}

/**
 * Adjust confidence score based on uncertainty.
 * EXPLORATORY => 0 (don't extract). Otherwise clamp (base + adjustment) to [0.1, 1.0].
 */
export function adjustConfidenceForUncertainty(
  baseConfidence: number,
  level: UncertaintyLevel | null,
  confidenceAdjustment: number,
): number {
  if (level === UncertaintyLevel.EXPLORATORY) return 0;
  const adjusted = baseConfidence + confidenceAdjustment;
  return Math.max(0.1, Math.min(1, adjusted));
}
