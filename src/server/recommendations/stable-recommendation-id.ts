import { createHash } from "node:crypto";
import { normalizeRecommendationLabel } from "./stable-id";

/**
 * Stable id for a recommendation row within a conversation so re-runs upsert
 * instead of duplicating.
 */
export function stableRecommendationItemId(
  conversationId: string,
  title: string,
  category: string,
): string {
  const base = `${conversationId}\u0000${normalizeRecommendationLabel(title)}\u0000${normalizeRecommendationLabel(category)}`;
  const h = createHash("sha256")
    .update(base, "utf8")
    .digest("hex")
    .slice(0, 16);
  return `rec-${conversationId.slice(0, 8)}-${h}`;
}
