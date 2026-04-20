import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import type { NormalizedRecommendationItem } from "@/lib/eva-dashboard/conversation-output-types";
import { shortlistKeyForTitle } from "@/lib/eva/recommendations/recommendation-identity-keys";

export type ShortlistMatchMaps = {
  productIds: Set<string>;
  rowIdByKey: Map<string, string>;
};

/**
 * Builds lookup maps from persisted shortlist rows so UI can mark “on shortlist” using
 * productId, sourceRecommendationId, and a title fallback for older rows.
 */
export function buildShortlistMatchMaps(
  rows: ProjectDetailGetResponse["shortlistItems"],
): ShortlistMatchMaps {
  const productIds = new Set<string>();
  const rowIdByKey = new Map<string, string>();
  for (const row of rows) {
    productIds.add(row.productId);
    rowIdByKey.set(row.productId, row.id);
    if (row.sourceRecommendationId?.trim()) {
      const sid = row.sourceRecommendationId.trim();
      productIds.add(sid);
      rowIdByKey.set(sid, row.id);
    }
    const titleKey = shortlistKeyForTitle(row.productName);
    productIds.add(titleKey);
    rowIdByKey.set(titleKey, row.id);
  }
  return { productIds, rowIdByKey };
}

export function recommendationItemMatchesShortlist(
  item: NormalizedRecommendationItem,
  maps: ShortlistMatchMaps,
): boolean {
  if (maps.productIds.has(item.id)) return true;
  return maps.productIds.has(shortlistKeyForTitle(item.title));
}

export function shortlistRowIdForRecommendationItem(
  item: NormalizedRecommendationItem,
  maps: ShortlistMatchMaps,
): string | undefined {
  return (
    maps.rowIdByKey.get(item.id) ??
    maps.rowIdByKey.get(shortlistKeyForTitle(item.title))
  );
}
