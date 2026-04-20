/** Checkout / address UI is SG-only in Phase 4 — single source for copy and snapshots. */
export const COMMERCE_DEFAULT_COUNTRY_CODE = "SG" as const;
export const COMMERCE_DEFAULT_COUNTRY_LABEL = "Singapore" as const;

export function formatAddressPostalLine(postalCode: string): string {
  return `${COMMERCE_DEFAULT_COUNTRY_LABEL} ${postalCode}`;
}
