import type { ExtractedPreferenceCandidate } from "./preference-types";

const NAMED_STYLE =
  /\b(scandinavian|japandi|industrial|mid[- ]century|farmhouse|coastal|bohemian|minimalist|contemporary|traditional|transitional|rustic|eclectic|art deco|wabi[- ]sabi|modern|maximalist)\b/i;

const COLOR_ROUTE =
  /\bcolor\s+palette\b|\bpaint\s+colou?r\b|\bwall\s+colou?r\b|\baccent\s+colou?r\b|\bearth\s+tones?\b|\bneutral(s)?\b|\bwarm\s+tones?\b|\bcool\s+tones?\b|\bwarm\s+beige\b|\bterracotta\b/i;

/**
 * Remap mis-routed style candidates that are clearly palette/color language.
 * Example: "warm beige and terracotta" should not stay as style.
 */
export function applyPreferenceFieldRouting(
  candidates: ExtractedPreferenceCandidate[],
): ExtractedPreferenceCandidate[] {
  return candidates.map((candidate) => {
    if (candidate.category !== "style") return candidate;
    const text = candidate.value;
    const evidence = candidate.evidenceText ?? candidate.value;
    if (
      text === "color palette" ||
      text === "palette" ||
      text === "colors" ||
      text === "color"
    ) {
      return { ...candidate, category: "color" };
    }
    if (COLOR_ROUTE.test(evidence) && !NAMED_STYLE.test(evidence)) {
      return { ...candidate, category: "color" };
    }
    if (/\bpalette\b/i.test(evidence) && !NAMED_STYLE.test(evidence)) {
      return { ...candidate, category: "color" };
    }
    return candidate;
  });
}
