/**
 * Shared normalization for recommendation shortlist matching and stable id hashing
 * so title-based lookups stay consistent across API + UI.
 */
export function normalizeRecommendationLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Prefix for secondary map keys derived from product title (not a DB id). */
export const SHORTLIST_TITLE_KEY_PREFIX = "title:" as const;

export function shortlistKeyForTitle(title: string): string {
  return `${SHORTLIST_TITLE_KEY_PREFIX}${normalizeRecommendationLabel(title)}`;
}
