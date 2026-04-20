import type {
  AnswerValue,
  BinaryPairsAnswer,
  SlidersAnswer,
  StyleKey,
} from "./types";
import { STYLE_QUESTIONS } from "./style-questions";

export function calculateResult(
  answers: Record<string, AnswerValue>,
): StyleKey {
  const tally: Record<StyleKey, number> = {
    minimal: 0,
    maximalist: 0,
    organic: 0,
    industrial: 0,
    artisan: 0,
  };

  const add = (style: StyleKey | undefined, weight = 1) => {
    if (style) tally[style] += weight;
  };

  STYLE_QUESTIONS.forEach((q) => {
    const ans = answers[q.id];
    if (!ans) return;

    if (q.type === "single-select" && typeof ans === "string") {
      const opt = q.options?.find((o) => o.id === ans);
      add(opt?.style);
    }

    if (
      (q.type === "multi-select" || q.type === "image-grid") &&
      Array.isArray(ans)
    ) {
      for (const id of ans as string[]) {
        const opt = (q.options ?? q.imageOptions)?.find((o) => o.id === id);
        add(opt?.style);
      }
    }

    if (q.type === "palette-cards" && typeof ans === "string") {
      const card = q.paletteCards?.find((c) => c.id === ans);
      add(card?.style);
    }

    if (
      q.type === "binary-pairs" &&
      typeof ans === "object" &&
      !Array.isArray(ans)
    ) {
      const pairs = ans as BinaryPairsAnswer;
      // straight/curves → minimal vs maximalist; candles/lights → organic vs industrial; etc.
      const styleMap: Record<string, StyleKey> = {
        "p4-left": "maximalist", // old bookstore
        "p4-right": "minimal", // modern gallery
        "p6-left": "minimal", // statement piece
        "p6-right": "maximalist", // many small details
        "p7-left": "industrial", // straight lines
        "p7-right": "organic", // soft curves
        "p3-left": "organic", // candles
        "p3-right": "minimal", // bright lights
      };
      Object.entries(pairs).forEach(([pairId, side]) => {
        const key = `${pairId}-${side}`;
        add(styleMap[key]);
      });
    }

    if (
      q.type === "sliders" &&
      typeof ans === "object" &&
      !Array.isArray(ans)
    ) {
      const sliders = ans as SlidersAnswer;
      // high lighting slider → maximalist; low → minimal
      if (sliders.lighting !== undefined) {
        if (sliders.lighting > 60) add("maximalist");
        else add("minimal");
      }
      // high storage (open) → maximalist; closed → minimal
      if (sliders.storage !== undefined) {
        if (sliders.storage > 60) add("maximalist");
        else add("minimal");
      }
    }
  });

  return Object.entries(tally).sort(([, a], [, b]) => b - a)[0][0] as StyleKey;
}
