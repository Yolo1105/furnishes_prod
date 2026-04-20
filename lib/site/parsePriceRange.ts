/**
 * Parse collection quick-filter price option strings into numeric bounds.
 * Used by the collections listing price filter.
 */
export function parsePriceRange(
  option: string,
): { min: number; max: number } | null {
  if (option === "All") return null;
  if (option.startsWith("Under")) {
    const m = option.match(/\$([0-9,]+)/);
    return m ? { min: 0, max: parseInt(m[1].replace(/,/g, ""), 10) } : null;
  }
  if (option.includes("+")) {
    const m = option.match(/\$([0-9,]+)/);
    return m
      ? { min: parseInt(m[1].replace(/,/g, ""), 10), max: Infinity }
      : null;
  }
  const m = option.match(/\$([0-9,]+)\s*(?:[–-]|\s+to\s+)\s*\$?([0-9,]+)/i);
  return m
    ? {
        min: parseInt(m[1].replace(/,/g, ""), 10),
        max: parseInt(m[2].replace(/,/g, ""), 10),
      }
    : null;
}
