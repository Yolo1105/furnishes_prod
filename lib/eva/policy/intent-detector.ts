/**
 * Keyword-based intent detection (no LLM). Used by policy enforcement.
 * Uses phrase/combination checks to reduce false positives (e.g. "I want to buy a sofa" = furniture, not shopping list).
 */

const LAYOUT_KEYWORDS = [
  "layout",
  "arrange",
  "place",
  "where should i put",
  "floor plan",
  "position",
  "placement",
  "where to put",
  "furniture arrangement",
];

/** Shopping list intent: require list/cost context, not just "buy" (e.g. "buy a sofa" = furniture recs). */
const SHOPPING_PHRASES = [
  "shopping list",
  "buy list",
  "what to buy",
  "list of what to buy",
  "how much will it cost",
  "total cost",
  "everything i need to buy",
  "everything to buy",
  "where to get",
  "shopping",
];

/** Furniture recs: "recommend" + furniture context; avoid "recommend a color palette". */
const FURNITURE_PHRASES = [
  "suggest furniture",
  "what sofa",
  "which table",
  "furniture recommendation",
  "what chair",
  "which chair",
  "what bed",
  "which bed",
  "what desk",
  "which desk",
];
const FURNITURE_NOUNS =
  /\b(sofa|chair|table|bed|desk|furniture|sectional|nightstand|dresser)\b/i;

export type Intent =
  | "layout_advice"
  | "shopping_list"
  | "furniture_recs"
  | null;

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  if (LAYOUT_KEYWORDS.some((k) => lower.includes(k))) return "layout_advice";
  if (SHOPPING_PHRASES.some((k) => lower.includes(k))) return "shopping_list";
  if (FURNITURE_PHRASES.some((k) => lower.includes(k))) return "furniture_recs";
  if (/\brecommend\b/i.test(lower) && FURNITURE_NOUNS.test(lower))
    return "furniture_recs";
  if (/\bsuggest a\b/i.test(lower) && FURNITURE_NOUNS.test(lower))
    return "furniture_recs";
  return null;
}
