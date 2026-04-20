/**
 * Distinguish exploratory / topic-chip prompts from explicit preference statements.
 * Classifier + extract persistence filter share one phrase list; regexes cover phrasing variants.
 */

/** User explicitly states a preference, constraint, or goal (not just a topic label). */
const EXPLICIT_PREFERENCE_CUE =
  /\b(?:i|we)(?:'d|\s+would|\s+will)?\s+(?:like|love|want|need|prefer|hate|avoid)\b/i;
const EXPLICIT_PREFERENCE_CUE2 =
  /\b(?:my|our)\s+(?:budget|style|palette|room|space|goal|priority|preference)\b/i;
const EXPLICIT_NEGATION =
  /\b(?:no|not|never|nothing)\s+(?:bright|dark|bold|)?\w+/i;
const MONEY_OR_BUDGET =
  /\$|€|£|\b\d[\d,]*(?:\.\d+)?\s*(?:k|m|thousand|million)?\b|\bbudget\b/i;

/**
 * Canonical lowercase phrases: never persist as preference values; also used to match
 * whole-message exploratory prompts where a color field would be wrong.
 */
export const GENERIC_TOPIC_LABEL_PHRASES: readonly string[] = [
  "color palette",
  "palette",
  "lighting ideas",
  "materials to consider",
  "space-saving furniture",
  "space saving furniture",
  "textiles and patterns",
  "textile and patterns",
  "indoor plants",
  "indoor plant",
  "favorite colors",
  "favorite color",
  "paint colors",
  "wall colors",
];

const REJECT_VALUE_NORMALIZED = new Set(
  GENERIC_TOPIC_LABEL_PHRASES.map((s) => s.toLowerCase()),
);

/**
 * Structural patterns for topic prompts. Exact short labels live in
 * {@link GENERIC_TOPIC_LABEL_PHRASES} and are matched via {@link messageLooksLikeExploratoryTopicLabel}.
 */
/** Phrases not covered by {@link GENERIC_TOPIC_LABEL_PHRASES} exact match. */
const TOPIC_LABEL_SHAPE_REGEXES: RegExp[] = [
  /\b(?:(?:paint\s+)?colors?|lighting|palette|paint)\s+ideas\b/i,
  /\b(?:wall\s+)?colors?\s+that\s+work\b/i,
  /\bthings?\s+to\s+consider\b/i,
];

/** True if the message is an exact generic label or matches a topic-shape pattern. */
export function messageLooksLikeExploratoryTopicLabel(
  messageLower: string,
): boolean {
  const compact = messageLower.replace(/\s+/g, " ").trim();
  if (REJECT_VALUE_NORMALIZED.has(compact)) return true;
  return TOPIC_LABEL_SHAPE_REGEXES.some((r) => r.test(messageLower));
}

const COLOR_TOKEN =
  /\b(?:black|white|grey|gray|navy|blue|green|red|pink|orange|yellow|purple|brown|beige|cream|ivory|tan|taupe|sage|charcoal|teal|coral|mint|gold|silver|mustard|terracotta|burgundy|lavender|plum|emerald|slate|oatmeal|sand|blush|rust|copper|bronze)\b/gi;

const NAMED_STYLE =
  /\b(?:scandinavian|industrial|minimalist|japandi|mid[- ]century|coastal|farmhouse|boho|bohemian|traditional|modern|contemporary|rustic|mediterranean|art\s+deco|wabi[- ]sabi)\b/i;

export function hasExplicitPreferenceLanguage(messageLower: string): boolean {
  return (
    EXPLICIT_PREFERENCE_CUE.test(messageLower) ||
    EXPLICIT_PREFERENCE_CUE2.test(messageLower) ||
    EXPLICIT_NEGATION.test(messageLower) ||
    MONEY_OR_BUDGET.test(messageLower)
  );
}

/** True when the message looks like a design style/aesthetic label, not a generic topic chip. */
export function looksLikeStyleOrAestheticStatement(
  messageLower: string,
): boolean {
  if (!NAMED_STYLE.test(messageLower)) return false;
  return /\b(?:style|styles|aesthetic|look|vibe|theme|inspired)\b/i.test(
    messageLower,
  );
}

export function countDistinctColorTokens(messageLower: string): number {
  const m = messageLower.match(COLOR_TOKEN);
  if (!m?.length) return 0;
  return new Set(m.map((s) => s.toLowerCase())).size;
}

function valueEmbedsRejectedPhrase(normalizedValue: string): boolean {
  const compact = normalizedValue.replace(/\s+/g, " ");
  for (const bad of REJECT_VALUE_NORMALIZED) {
    if (
      compact === bad ||
      compact.startsWith(`${bad} `) ||
      compact.endsWith(` ${bad}`)
    )
      return true;
  }
  return false;
}

/**
 * True if this extracted value + source message should not be persisted as a preference.
 */
export function shouldRejectGenericPreferenceValue(
  field: string,
  value: string,
  sourceMessage: string,
): boolean {
  const v = value.trim().toLowerCase();
  const msg = sourceMessage.trim().toLowerCase();
  if (!v) return true;
  if (REJECT_VALUE_NORMALIZED.has(v)) return true;
  if (valueEmbedsRejectedPhrase(v)) return true;

  if (field === "color" && REJECT_VALUE_NORMALIZED.has(msg)) return true;

  if (
    field === "color" &&
    messageLooksLikeExploratoryTopicLabel(msg) &&
    !hasExplicitPreferenceLanguage(msg)
  )
    return true;

  if (
    field === "color" &&
    (v === "color" || v === "colors" || v === "palette") &&
    !hasExplicitPreferenceLanguage(msg)
  )
    return true;

  return false;
}
