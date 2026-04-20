import { revalidatePath } from "next/cache";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";

/** Stable 0–359 cover hue from an opaque product / recommendation id (shared by API + server actions). */
export function coverHueFromProductId(productId: string): number {
  let h = 0;
  for (let i = 0; i < productId.length; i++) {
    h = (h * 31 + productId.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * Recommendations payload uses estimated whole-currency units; shortlist stores cents.
 */
export function recommendationEstimatedPriceToCents(
  estimatedPrice: number | null | undefined,
): number {
  return Math.max(0, Math.round((estimatedPrice ?? 0) * 100));
}

/** Invalidate account pages that show shortlist or project-scoped rows. */
export function revalidateAccountShortlistSurfaces(opts: {
  projectId?: string | null;
  shortlistItemId?: string;
}) {
  revalidatePath(accountPaths.shortlistRoot);
  if (opts.shortlistItemId) {
    revalidatePath(accountPaths.shortlistItem(opts.shortlistItemId));
  }
  if (opts.projectId) {
    revalidatePath(accountPaths.project(opts.projectId));
  }
}
