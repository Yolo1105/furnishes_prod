import type { SupportStatus } from "./types";

/**
 * Map support thread status → visual StatusBadge variant.
 * Shared across help view, feedback view, and thread detail view.
 */
export function supportStatusVariant(
  s: SupportStatus,
): "active" | "archived" | "warn" | "ok" {
  switch (s) {
    case "open":
      return "active";
    case "awaiting_user":
      return "warn";
    case "resolved":
      return "archived";
    case "received":
      return "active";
    case "under_review":
      return "warn";
    case "shipped":
      return "ok";
    case "wont_ship":
      return "archived";
    case "declined":
      return "archived";
  }
}

/**
 * Map support thread status → human-readable label for the badge text.
 */
export function supportStatusLabel(s: SupportStatus): string {
  return {
    open: "OPEN",
    awaiting_user: "AWAITING YOU",
    resolved: "RESOLVED",
    received: "RECEIVED",
    under_review: "UNDER REVIEW",
    shipped: "SHIPPED",
    wont_ship: "WON'T SHIP",
    declined: "DECLINED",
  }[s];
}

/**
 * Is this thread in a terminal / closed state? Used to hide reply composer.
 */
export function isSupportThreadClosed(s: SupportStatus): boolean {
  return (
    s === "resolved" || s === "shipped" || s === "wont_ship" || s === "declined"
  );
}
