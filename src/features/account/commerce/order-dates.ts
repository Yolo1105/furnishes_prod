/**
 * Date formatting shared by Orders and Billing, which display the same order
 * timestamps and must not drift into two different formats.
 */

export function shortOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
  });
}

export function longOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
