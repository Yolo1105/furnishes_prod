import { isStudioPlaygroundPathname } from "@/lib/routes/studio-playground-path";

/**
 * Left / right utility strip (locale, delivery, store) — shared across pages.
 * Center copy is per-route; see `getUtilityBarCenterMessage`.
 */

/** Persisted in `localStorage` under this key (client-only). */
export const UTILITY_LOCALE_STORAGE_KEY = "furnishes.utility.locale";

export type UtilityLocaleId = "en-SG" | "zh-SG";

export const UTILITY_LOCALE_OPTIONS: ReadonlyArray<{
  id: UtilityLocaleId;
  label: string;
  disabled?: boolean;
}> = [
  { id: "en-SG", label: "SG | English" },
  { id: "zh-SG", label: "SG | 中文", disabled: true },
];

export function getLocaleLabel(id: UtilityLocaleId): string {
  const match = UTILITY_LOCALE_OPTIONS.find((o) => o.id === id);
  return match?.label ?? UTILITY_LOCALE_OPTIONS[0].label;
}

/** Default label (SSR / before hydration). */
export const UTILITY_LOCALE_LABEL = getLocaleLabel("en-SG");

/** Short location / store line (right side). */
export const UTILITY_LOCATION_LABEL = "Singapore";

/** Delivery or service hint (right side, before location). */
export const UTILITY_DELIVERY_LABEL = "Nationwide delivery";

export const UTILITY_DELIVERY_TITLE = "Nationwide delivery";
export const UTILITY_DELIVERY_BODY =
  "Orders ship across Singapore. Estimated lead times are listed on each product page.";
export const UTILITY_DELIVERY_HREF = "/terms";
export const UTILITY_DELIVERY_LINK_LABEL = "Shipping & terms";

export const UTILITY_LOCATION_TITLE = "Based in Singapore";
export const UTILITY_LOCATION_BODY =
  "We design and source for homes here. Learn how we work with local spaces and timelines.";
export const UTILITY_LOCATION_HREF = "/about";
export const UTILITY_LOCATION_LINK_LABEL = "About Furnishes";

/**
 * Contextual message for the center of the utility bar — change by route.
 */
export function getUtilityBarCenterMessage(pathname: string): string {
  if (pathname === "/") {
    return "Planning a renovation? Explore materials, spaces, and ideas tailored to your home.";
  }
  if (pathname === "/collections") {
    return "Filter by room, style, and price. Curated pieces for considered living.";
  }
  if (pathname.startsWith("/collections/")) {
    return "Need specs or delivery options? Dimensions, materials, and care are listed below.";
  }
  if (pathname === "/inspiration" || pathname.startsWith("/inspiration/")) {
    return "Tools and inspiration to shape your space, from mood boards to planning.";
  }
  if (pathname === "/about" || pathname.startsWith("/about/")) {
    return "Learn how we work. Studio process, materials, and the team behind Furnishes.";
  }
  if (isStudioPlaygroundPathname(pathname)) {
    return "Sandbox for experiments: layouts, motion, and UI checks before they go live.";
  }
  return "Interior design and renovation. Quality materials, enduring spaces.";
}
