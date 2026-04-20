/**
 * Timezone-safe time helpers. All functions run on the server or the
 * client but return deterministic results (no wall-clock drift between
 * them within the same request).
 *
 * Furnishes' market is Singapore — everything defaults to Asia/Singapore
 * unless the caller passes an override.
 */

export const SG_TIMEZONE = "Asia/Singapore";

/**
 * Hour (0-23) in SG local time — server and client produce the same value
 * for the same Date input.
 */
export function hourInSG(date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-SG", {
    timeZone: SG_TIMEZONE,
    hour: "numeric",
    hour12: false,
  });
  return Number(fmt.format(date));
}

/**
 * Editorial greeting keyed on local hour.
 */
export function getGreetingSGT(date = new Date()): string {
  const h = hourInSG(date);
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Relative time like "2d ago", "3h ago". Accepts ISO strings or Date.
 * Values under 60s render as "just now".
 */
export function relativeTime(input: string | Date, now = new Date()): string {
  const then = typeof input === "string" ? new Date(input) : input;
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 60_000) return "just now";
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
}

/**
 * Formatted short date in SG locale, e.g. "3 Apr".
 */
export function shortDateSG(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SG_TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(d);
}
