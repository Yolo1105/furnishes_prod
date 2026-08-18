import type { QuizResultV1 } from "@/lib/contracts/quiz-result";

/** Style archetype keys used by FurnishesDesignQuiz tally. */
type QuizStyleKey =
  "minimal" | "maximalist" | "organic" | "industrial" | "artisan";

const STYLE_PREF_NAMES: Record<QuizStyleKey, string> = {
  minimal: "minimalist",
  maximalist: "maximalist",
  organic: "organic",
  industrial: "industrial",
  artisan: "artisan",
};

const STYLE_PALETTES: Record<QuizStyleKey, string[]> = {
  minimal: ["warm linen", "soft taupe", "sage mist"],
  maximalist: ["terracotta", "warm oak", "cream"],
  organic: ["olive", "warm oak", "cream"],
  industrial: ["olive", "slate", "warm oak"],
  artisan: ["warm oak", "olive", "cream"],
};

const STYLE_LIFESTYLE: Record<QuizStyleKey, string[]> = {
  minimal: ["white space", "pure material", "restraint"],
  maximalist: ["abundance", "layered", "warmth"],
  organic: ["earth", "texture", "growth"],
  industrial: ["structure", "raw edge", "function"],
  artisan: ["craft", "handmade", "patina"],
};

const ROOM_FROM_B2A: Record<string, string> = {
  "b2a-lr": "living room",
  "b2a-br": "bedroom",
  "b2a-ho": "home office",
  "b2a-dr": "dining room",
  "b2a-st": "studio",
};

function isStyleKey(value: string): value is QuizStyleKey {
  return value in STYLE_PREF_NAMES;
}

function fmtUsdCompact(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    const text = Number.isInteger(k)
      ? String(k)
      : k.toFixed(1).replace(/\.0$/, "");
    return `$${text}k`;
  }
  return `$${amount}`;
}

function furnitureLabel(id: string): string {
  return id.replace(/^r10-/, "").replace(/-/g, " ").trim().toLowerCase();
}

type QuizAssemblyInput = {
  mode?: string;
  tally: Record<string, number>;
  answers: Record<string, unknown>;
  budgetRange: [number, number] | null;
};

/**
 * Map live quiz state into QuizResultV1 (client + unit tests).
 * Palette "avoid" stays empty — the quiz has no exclusion category today.
 */
export function assembleQuizResultV1(input: QuizAssemblyInput): QuizResultV1 {
  const ranked = Object.entries(input.tally)
    .filter(([, score]) => typeof score === "number")
    .sort(([, a], [, b]) => b - a);

  const primaryKey = ranked[0]?.[0];
  const primary =
    primaryKey && isStyleKey(primaryKey)
      ? STYLE_PREF_NAMES[primaryKey]
      : "contemporary";

  const secondary = ranked
    .slice(1)
    .filter(([, score]) => score > 0)
    .map(([key]) => (isStyleKey(key) ? STYLE_PREF_NAMES[key] : null))
    .filter((value): value is string => Boolean(value));

  const paletteKey =
    primaryKey && isStyleKey(primaryKey) ? primaryKey : "minimal";
  const colors = STYLE_PALETTES[paletteKey] ?? [];
  const lifestyle = STYLE_LIFESTYLE[paletteKey] ?? [];

  const b2a = typeof input.answers.b2a === "string" ? input.answers.b2a : null;
  const roomFocus = b2a ? (ROOM_FROM_B2A[b2a] ?? null) : null;

  const b1 = input.answers.b1 as
    { path?: string; amount?: number; strictness?: string } | undefined;
  let budgetBand: string | null = null;
  if (b1?.path === "know" && typeof b1.amount === "number") {
    budgetBand = fmtUsdCompact(b1.amount);
  } else if (input.budgetRange) {
    budgetBand = `${fmtUsdCompact(input.budgetRange[0])}–${fmtUsdCompact(input.budgetRange[1])}`;
  }

  const furnitureRaw = input.answers.r10;
  const furniture = Array.isArray(furnitureRaw)
    ? furnitureRaw
        .filter((id): id is string => typeof id === "string")
        .map(furnitureLabel)
        .filter(Boolean)
    : [];

  const rawScores: Record<string, number> = {};
  for (const [key, score] of ranked) {
    if (isStyleKey(key)) rawScores[STYLE_PREF_NAMES[key]] = score;
  }

  return {
    version: 1,
    completedAt: new Date().toISOString(),
    answers: {
      style: { primary, secondary },
      palette: { colors, avoid: [] },
      roomFocus,
      budgetBand,
      lifestyle,
      furniture,
    },
    rawScores,
  };
}
