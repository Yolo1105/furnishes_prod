/**
 * Fast same-turn constraint extraction so explicit facts influence the current
 * reply before async preference extraction runs. Pure regex — no LLM calls.
 *
 * Re-derived from legacy `lib/eva/core/critical-turn-extraction.ts`.
 */

type CriticalTurnFacts = {
  explicitBudget: string | null;
  roomTypeHint: string | null;
  widthFeet: number | null;
  lengthFeet: number | null;
  heightFeet: number | null;
  seatCount: number | null;
  householdCount: number | null;
  hardConstraints: string[];
  exclusions: string[];
  styleHints: string[];
  materialConstraints: string[];
  durabilityNotes: string[];
  timeConstraints: string[];
  contradictions: string[];
};

const EXCLUSION_PATTERNS: RegExp[] = [
  /\b(?:avoid|no|never|don't|do not|skip)\s+([^.,;]+)/gi,
  /\bwithout\s+([^.,;]+)/gi,
];

const BUDGET_PATTERN =
  /\b(?:under|below|max(?:imum)?|budget|around|about)\s*(?:\$|USD\s*|SGD\s*)?([\d,.]+)\s*(?:k|thousand)?\b/gi;

const ROOM_PATTERN =
  /\b((?:living\s*room)|bedroom|dining(?:\s*room)?|kitchen|office|bathroom|studio)\b/i;

/** e.g. 12x14, 12 x 14, 12 by 14 feet */
const DIM_FT_SIMPLE =
  /(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|'|′)?\s*(?:x|by|×)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|'|′)?/i;

const DIM_M = /\b(\d+(?:\.\d+)?)\s*m\b[^0-9]{0,8}(\d+(?:\.\d+)?)\s*m\b/i;

const SEAT_COUNT_PATTERN =
  /\b(?:seats?|seat(?:ing)?\s+for|dining\s+table\s+for)\s+(\d{1,2})\b/i;

const HOUSEHOLD_COUNT_PATTERN =
  /\b(?:family\s+of|household\s+of|for\s+a\s+family\s+of)\s+(\d{1,2})\b/i;

const HARD_CONSTRAINT_PATTERNS: RegExp[] = [
  /\b(?:must\s+fit|has\s+to\s+fit|need(?:s)?\s+to\s+fit)[^.,;]{0,80}/gi,
  /\b(?:no\s+more\s+than|at\s+most|maximum\s+of)\s+[^.,;]{1,60}/gi,
  /\b(?:cannot|can't|won't)\s+(?:fit|work|use)[^.,;]{0,60}/gi,
];

function parseBudgetFromText(text: string): string | null {
  BUDGET_PATTERN.lastIndex = 0;
  const match = BUDGET_PATTERN.exec(text);
  if (!match) return null;
  const raw = match[0].trim();
  return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
}

function parseRoomType(text: string): string | null {
  const match = ROOM_PATTERN.exec(text.toLowerCase());
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ").trim();
}

function parseDimensionsFeet(text: string): {
  width: number | null;
  length: number | null;
} {
  const imperial = DIM_FT_SIMPLE.exec(text);
  if (imperial?.[1] && imperial[2]) {
    return {
      width: Number.parseFloat(imperial[1]),
      length: Number.parseFloat(imperial[2]),
    };
  }
  const metric = DIM_M.exec(text);
  if (metric?.[1] && metric[2]) {
    return {
      width: Number.parseFloat(metric[1]) * 3.28084,
      length: Number.parseFloat(metric[2]) * 3.28084,
    };
  }
  return { width: null, length: null };
}

function parsePositiveInt(text: string, pattern: RegExp): number | null {
  const match = pattern.exec(text);
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function collectExclusions(text: string): string[] {
  const out: string[] = [];
  for (const pattern of EXCLUSION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const chunk = match[1]?.trim();
      if (chunk && chunk.length > 2 && chunk.length < 120) {
        out.push(chunk);
      }
    }
  }
  return [...new Set(out)].slice(0, 12);
}

function collectHardConstraints(text: string): string[] {
  const out: string[] = [];
  for (const pattern of HARD_CONSTRAINT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const chunk = match[0]?.trim();
      if (chunk && chunk.length > 3 && chunk.length < 120) {
        out.push(chunk.replace(/\s+/g, " "));
      }
    }
  }
  return [...new Set(out)].slice(0, 8);
}

const STYLE_WORDS =
  /\b(japandi|scandi|minimal|industrial|mid[- ]century|boho|coastal|traditional|modern|rustic)\b/gi;

function collectStyleHints(text: string): string[] {
  const out: string[] = [];
  STYLE_WORDS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STYLE_WORDS.exec(text)) !== null) {
    out.push(match[1]!);
  }
  return [...new Set(out.map((s) => s.toLowerCase()))].slice(0, 8);
}

const MATERIAL_WORDS =
  /\b(oak|walnut|maple|marble|travertine|linen|boucle|velvet|brass|chrome|rattan|leather)\b/gi;

function collectMaterials(text: string): string[] {
  const out: string[] = [];
  MATERIAL_WORDS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MATERIAL_WORDS.exec(text)) !== null) {
    out.push(match[1]!.toLowerCase());
  }
  return [...new Set(out)].slice(0, 10);
}

const DURABILITY_PATTERN =
  /\b(pet|kid|child|durable|performance\s+fabric|scratch|stain)\b/gi;

function collectDurability(text: string): string[] {
  const out: string[] = [];
  DURABILITY_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DURABILITY_PATTERN.exec(text)) !== null) {
    out.push(match[1]!);
  }
  return [...new Set(out.map((s) => s.toLowerCase()))].slice(0, 8);
}

const TIME_PATTERN =
  /\b(move[- ]?in|deadline|this\s+week|next\s+month|urgent|rush|asap)\b/gi;

function collectTime(text: string): string[] {
  const out: string[] = [];
  TIME_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TIME_PATTERN.exec(text)) !== null) {
    out.push(match[1]!);
  }
  return [...new Set(out.map((s) => s.toLowerCase()))].slice(0, 6);
}

/** True when at least one fact worth injecting into the system prompt exists. */
export function hasCriticalTurnFacts(facts: CriticalTurnFacts): boolean {
  return Boolean(
    facts.explicitBudget ||
    facts.roomTypeHint ||
    (facts.widthFeet != null && facts.lengthFeet != null) ||
    facts.seatCount != null ||
    facts.householdCount != null ||
    facts.hardConstraints.length ||
    facts.exclusions.length ||
    facts.styleHints.length ||
    facts.materialConstraints.length ||
    facts.durabilityNotes.length ||
    facts.timeConstraints.length ||
    facts.contradictions.length,
  );
}

/**
 * Heuristic same-turn facts from the latest user message.
 * Does not call external APIs.
 */
export function extractCriticalTurnFacts(
  userMessage: string,
): CriticalTurnFacts {
  const exclusions = collectExclusions(userMessage);
  const dims = parseDimensionsFeet(userMessage);
  const styleHints = collectStyleHints(userMessage);
  const materialConstraints = collectMaterials(userMessage);
  const durabilityNotes = collectDurability(userMessage);
  const timeConstraints = collectTime(userMessage);
  const hardConstraints = collectHardConstraints(userMessage);

  const contradictions: string[] = [];
  if (
    exclusions.some((e) => /dark\s*wood/i.test(e)) &&
    materialConstraints.some((m) => /walnut|oak/i.test(m))
  ) {
    contradictions.push(
      "User mentioned avoiding dark wood but also named wood species — confirm intent.",
    );
  }

  return {
    explicitBudget: parseBudgetFromText(userMessage),
    roomTypeHint: parseRoomType(userMessage),
    widthFeet: dims.width,
    lengthFeet: dims.length,
    heightFeet: null,
    seatCount: parsePositiveInt(userMessage, SEAT_COUNT_PATTERN),
    householdCount: parsePositiveInt(userMessage, HOUSEHOLD_COUNT_PATTERN),
    hardConstraints,
    exclusions,
    styleHints,
    materialConstraints,
    durabilityNotes,
    timeConstraints,
    contradictions,
  };
}

export function criticalFactsToPromptBlock(facts: CriticalTurnFacts): string {
  const lines: string[] = [];
  lines.push(
    "Same-turn user constraints (parsed from this message — honor over vague prior context):",
  );
  if (facts.explicitBudget) {
    lines.push(`- Budget: ${facts.explicitBudget}`);
  }
  if (facts.roomTypeHint) {
    lines.push(`- Room type: ${facts.roomTypeHint}`);
  }
  if (facts.widthFeet != null && facts.lengthFeet != null) {
    lines.push(
      `- Stated footprint (approx): ${facts.widthFeet.toFixed(1)} ft × ${facts.lengthFeet.toFixed(1)} ft`,
    );
  }
  if (facts.seatCount != null) {
    lines.push(`- Seating capacity: ${facts.seatCount}`);
  }
  if (facts.householdCount != null) {
    lines.push(`- Household size: ${facts.householdCount}`);
  }
  if (facts.hardConstraints.length) {
    lines.push(`- Hard constraints: ${facts.hardConstraints.join("; ")}`);
  }
  if (facts.exclusions.length) {
    lines.push(`- Avoid / exclude: ${facts.exclusions.join("; ")}`);
  }
  if (facts.styleHints.length) {
    lines.push(`- Style keywords: ${facts.styleHints.join(", ")}`);
  }
  if (facts.materialConstraints.length) {
    lines.push(
      `- Materials mentioned: ${facts.materialConstraints.join(", ")}`,
    );
  }
  if (facts.durabilityNotes.length) {
    lines.push(`- Durability / household: ${facts.durabilityNotes.join(", ")}`);
  }
  if (facts.timeConstraints.length) {
    lines.push(`- Timing: ${facts.timeConstraints.join(", ")}`);
  }
  if (facts.contradictions.length) {
    lines.push(`- Possible conflicts: ${facts.contradictions.join(" ")}`);
  }
  return lines.join("\n");
}
