/**
 * Confirmed preferences are stored as one string per category.
 * Multiple values are joined with ", " for display and editing.
 */

const SPLIT = /\s*,\s*/;

export function splitPreferenceValues(
  value: string | null | undefined,
): string[] {
  if (!value?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(SPLIT)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function joinPreferenceValues(values: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.join(", ");
}
