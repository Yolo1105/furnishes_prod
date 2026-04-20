import { getCollectionProduct } from "@/content/site/collection";

/** Returns authoritative unit price in cents for a catalog product id, or null if unknown. */
export function getValidatedUnitPriceCents(productId: string): number | null {
  const p = getCollectionProduct(productId);
  if (!p) return null;
  return Math.round(p.price * 100);
}
