import { STYLE_QUESTIONS } from "@/features/quiz/data/style-questions";
import type {
  QuizAnswers,
  QuizStyleKey,
  RankedStyle,
  StyleTally,
} from "@/features/quiz/data/types";

const ROOM_BASE: Record<string, [number, number]> = {
  "b2a-lr": [5000, 15000],
  "b2a-br": [3000, 10000],
  "b2a-ho": [2000, 8000],
  "b2a-dr": [3000, 12000],
  "b2a-st": [4000, 12000],
};
const SIZE_MULT: Record<string, number> = {
  "b2b-sm": 0.7,
  "b2b-md": 1,
  "b2b-lg": 1.4,
};
const QUALITY_MULT: Record<string, number> = {
  "b2e-bud": 0.5,
  "b2e-mid": 1,
  "b2e-hi": 2,
};
const DURATION_MULT: Record<string, number> = {
  "b2d-sh": 0.6,
  "b2d-md": 1,
  "b2d-lg": 1.3,
};
const START_MULT: Record<string, number> = {
  "b2c-em": 1.2,
  "b2c-so": 1,
  "b2c-fw": 0.5,
};
const SHOP_MULT: Record<string, number> = {
  "b2f-hunt": 0.7,
  "b2f-bal": 0.85,
  "b2f-conv": 1,
};

export function computeBudgetRange(
  roomType: string | undefined,
  size: string | undefined,
  start: string | undefined,
  duration: string | undefined,
  quality: string | undefined,
  shopping: string | undefined,
): [number, number] {
  const base = (roomType && ROOM_BASE[roomType]) || [5000, 15000];
  const m =
    (SIZE_MULT[size ?? ""] ?? 1) *
    (QUALITY_MULT[quality ?? ""] ?? 1) *
    (DURATION_MULT[duration ?? ""] ?? 1) *
    (START_MULT[start ?? ""] ?? 1) *
    (SHOP_MULT[shopping ?? ""] ?? 1);
  return [
    Math.round((base[0] * m) / 100) * 100,
    Math.round((base[1] * m) / 100) * 100,
  ];
}

/** Full five-style tally, ranked descending — powers the results breakdown. */
export function rankTally(tally: Record<string, number>): RankedStyle[] {
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  return Object.entries(tally)
    .sort(([, a], [, b]) => b - a)
    .map(([key, score]) => ({
      key,
      score,
      pct: total > 0 ? Math.round((score / total) * 100) : 0,
    }));
}

export function calculateTally(answers: QuizAnswers): StyleTally {
  const tally: StyleTally = {
    minimal: 0,
    maximalist: 0,
    organic: 0,
    industrial: 0,
    artisan: 0,
  };
  const add = (style: string | undefined, weight = 1) => {
    if (style && style in tally) {
      tally[style as QuizStyleKey] += weight;
    }
  };

  STYLE_QUESTIONS.forEach((q) => {
    const ans = answers[q.id];
    if (!ans) return;

    if (q.type === "single-select" && typeof ans === "string") {
      add(q.options?.find((o) => o.id === ans)?.style);
    }
    if (
      (q.type === "multi-select" || q.type === "image-grid") &&
      Array.isArray(ans)
    ) {
      for (const id of ans) {
        const opts = q.options ?? q.imageOptions;
        add(opts?.find((o) => o.id === id)?.style);
      }
    }
    if (q.type === "palette-cards" && typeof ans === "string") {
      add(q.paletteCards?.find((c) => c.id === ans)?.style);
    }
    if (
      q.type === "binary-pairs" &&
      typeof ans === "object" &&
      !Array.isArray(ans)
    ) {
      const styleMap: Record<string, QuizStyleKey> = {
        "p4-left": "maximalist",
        "p4-right": "minimal",
        "p6-left": "minimal",
        "p6-right": "maximalist",
        "p7-left": "industrial",
        "p7-right": "organic",
        "p3-left": "organic",
        "p3-right": "minimal",
      };
      Object.entries(ans as Record<string, string>).forEach(([pairId, side]) =>
        add(styleMap[`${pairId}-${side}`]),
      );
    }
    if (
      q.type === "sliders" &&
      typeof ans === "object" &&
      !Array.isArray(ans)
    ) {
      const sliders = ans as Record<string, number>;
      if (sliders.lighting !== undefined)
        add(sliders.lighting > 60 ? "maximalist" : "minimal");
      if (sliders.storage !== undefined)
        add(sliders.storage > 60 ? "maximalist" : "minimal");
    }
  });

  return tally;
}
