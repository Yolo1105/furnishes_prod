/** Shared normalization for recommendation identity hashing. */

export function normalizeRecommendationLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
