import { normalizePreferenceValue } from "./preference-normalization";
import type {
  ChatPreferenceCategory,
  ExtractedPreferenceCandidate,
} from "./preference-types";

const STYLE_TERMS = [
  "modern",
  "traditional",
  "minimalist",
  "scandinavian",
  "industrial",
  "bohemian",
  "contemporary",
  "vintage",
  "rustic",
  "farmhouse",
  "mid-century",
  "art deco",
  "japanese",
  "mediterranean",
  "coastal",
  "glam",
  "maximalist",
  "eclectic",
  "japandi",
  "boho",
];

const COLOR_TERMS = [
  "blue",
  "green",
  "red",
  "yellow",
  "purple",
  "pink",
  "orange",
  "brown",
  "gray",
  "grey",
  "white",
  "black",
  "beige",
  "cream",
  "navy",
  "teal",
  "neutral",
  "warm",
  "cool",
  "sage",
  "charcoal",
  "ivory",
  "taupe",
  "terracotta",
  "mustard",
  "blush",
];

const FURNITURE_TERMS = [
  "sofa",
  "couch",
  "bed",
  "table",
  "chair",
  "desk",
  "dresser",
  "nightstand",
  "lamp",
  "rug",
  "curtain",
  "shelf",
  "cabinet",
  "sectional",
  "wardrobe",
];

type NegatedByCategory = Partial<
  Record<"style" | "color" | "furniture", string[]>
>;

function collectNegatedPhrases(message: string): string[] {
  const patterns = [
    /\bdon'?t\s+like\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bdo\s+not\s+like\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bhate\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bnot\s+(?:too\s+)?([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bno\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bavoid\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bdon'?t\s+want\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\bdo\s+not\s+want\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\b(?:i'?m|i am|we'?re|we are)\s+(?:so\s+)?(?:over|done with|tired of)\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
    /\banything\s+but\s+([a-z][a-z\s-]{0,40}?)(?=\s*$|,|\.|!|\?|;)/gi,
  ];
  const phrases: string[] = [];
  for (const pattern of patterns) {
    for (const match of message.matchAll(pattern)) {
      const phrase = match[1]?.trim().toLowerCase();
      if (phrase) phrases.push(phrase);
    }
  }
  return phrases;
}

function mapPhraseToCategories(phrase: string): NegatedByCategory {
  const result: NegatedByCategory = {};
  const tokens = phrase.split(/\s+/).filter(Boolean);
  const haystack = ` ${phrase} `;

  for (const term of STYLE_TERMS) {
    if (haystack.includes(` ${term} `) || phrase === term) {
      result.style = [...(result.style ?? []), term];
    }
  }
  for (const term of COLOR_TERMS) {
    if (
      haystack.includes(` ${term} `) ||
      phrase === term ||
      tokens.includes(term)
    ) {
      result.color = [...(result.color ?? []), term];
    }
  }
  for (const term of FURNITURE_TERMS) {
    if (haystack.includes(` ${term} `) || phrase === term) {
      result.furniture = [...(result.furniture ?? []), term];
    }
  }
  return result;
}

function detectNegatedPreferenceTerms(message: string): NegatedByCategory {
  const merged: NegatedByCategory = {};
  for (const phrase of collectNegatedPhrases(message)) {
    const mapped = mapPhraseToCategories(phrase);
    for (const key of ["style", "color", "furniture"] as const) {
      const values = mapped[key];
      if (!values?.length) continue;
      merged[key] = [...new Set([...(merged[key] ?? []), ...values])];
    }
  }
  return merged;
}

function valueMentionsTerm(
  category: ChatPreferenceCategory,
  value: string,
  term: string,
): boolean {
  const normalized =
    normalizePreferenceValue(category, value)?.toLowerCase() ??
    value.toLowerCase();
  return (
    normalized === term ||
    normalized.includes(term) ||
    ` ${normalized} `.includes(` ${term} `)
  );
}

/**
 * Drop positive candidates that match negated terms.
 * Never invent exclusion / "avoid" memory — frontend has no exclusion category.
 */
export function dropNegatedPreferenceCandidates(
  candidates: ExtractedPreferenceCandidate[],
  message: string,
): ExtractedPreferenceCandidate[] {
  const negated = detectNegatedPreferenceTerms(message);
  if (!Object.keys(negated).length) return candidates;

  return candidates.filter((candidate) => {
    if (
      candidate.category !== "style" &&
      candidate.category !== "color" &&
      candidate.category !== "furniture"
    ) {
      return true;
    }
    const terms = negated[candidate.category] ?? [];
    return !terms.some((term) =>
      valueMentionsTerm(candidate.category, candidate.value, term),
    );
  });
}
