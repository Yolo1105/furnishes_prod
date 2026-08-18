/**
 * EXPLAIN enforcement: recommendation reasons must cite confirmed user facts.
 */

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "for",
  "in",
  "on",
  "with",
  "my",
  "our",
  "room",
  "style",
  "color",
  "budget",
  "furniture",
]);

/**
 * Tokenize preference values into matchable fact fragments (heuristic).
 * Never logs preference text — callers own telemetry without values.
 */
export function collectUserFactTokens(
  preferences: Record<string, string>,
): string[] {
  const tokens = new Set<string>();
  for (const value of Object.values(preferences)) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    tokens.add(trimmed.toLowerCase());

    // Budget-friendly fragments: "$6k", "6k", "6000"
    const money = trimmed.match(/\$?\s*(\d+(?:\.\d+)?)\s*(k|K)?/);
    if (money?.[1]) {
      const num = money[1];
      tokens.add(num.toLowerCase());
      if (money[2]) tokens.add(`${num}k`.toLowerCase());
      tokens.add(`$${num}${money[2] ? "k" : ""}`.toLowerCase());
    }

    for (const part of trimmed.split(/[,;/|]+|\s+/)) {
      const word = part
        .trim()
        .toLowerCase()
        .replace(/^[^a-z0-9$]+|[^a-z0-9$]+$/g, "");
      if (word.length < 3 || STOP.has(word)) continue;
      tokens.add(word);
    }
  }
  return [...tokens].sort((a, b) => b.length - a.length);
}

/**
 * True when `reason` contains ≥1 confirmed preference fragment.
 * If there are no confirmed facts, returns true (nothing to enforce).
 */
export function reasonCitesUserFacts(
  reason: string,
  preferences: Record<string, string>,
): boolean {
  const facts = collectUserFactTokens(preferences);
  if (facts.length === 0) return true;
  const hay = reason.toLowerCase();
  return facts.some((fact) => hay.includes(fact));
}

export function itemsMissingUserFactCitation(
  items: Array<{ reasonWhyItFits: string }>,
  preferences: Record<string, string>,
): number {
  if (collectUserFactTokens(preferences).length === 0) return 0;
  return items.filter(
    (item) => !reasonCitesUserFacts(item.reasonWhyItFits, preferences),
  ).length;
}
