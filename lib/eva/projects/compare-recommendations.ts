import type { SnapshotRecommendationItem } from "@/lib/eva/projects/decision-schemas";

type Item = Pick<
  SnapshotRecommendationItem,
  "id" | "title" | "category" | "estimatedPrice" | "reasonWhyItFits"
>;

export type PathComparisonResult = {
  overlapCategories: string[];
  uniqueToA: string[];
  uniqueToB: string[];
  priceGap: string | null;
  summary: string;
};

function categorySet(items: Item[]): Set<string> {
  return new Set(items.map((i) => i.category).filter(Boolean));
}

/**
 * Compare two recommendation paths from real item data (no LLM).
 */
export function compareTwoPaths(
  labelA: string,
  itemsA: Item[],
  labelB: string,
  itemsB: Item[],
): PathComparisonResult {
  const catA = categorySet(itemsA);
  const catB = categorySet(itemsB);
  const overlapCategories = [...catA].filter((c) => catB.has(c));
  const uniqueToA = [...catA].filter((c) => !catB.has(c));
  const uniqueToB = [...catB].filter((c) => !catA.has(c));

  const pricesA = itemsA
    .map((i) => i.estimatedPrice)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const pricesB = itemsB
    .map((i) => i.estimatedPrice)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const aAvg = avg(pricesA);
  const bAvg = avg(pricesB);
  let priceGap: string | null = null;
  if (aAvg != null && bAvg != null && Math.abs(aAvg - bAvg) > 1) {
    priceGap =
      aAvg < bAvg
        ? `“${labelA}” skews lower budget on average than “${labelB}”.`
        : `“${labelB}” skews lower budget on average than “${labelA}”.`;
  }

  const summaryParts: string[] = [];
  if (overlapCategories.length > 0) {
    summaryParts.push(
      `Shared focus: ${overlapCategories.slice(0, 4).join(", ")}${overlapCategories.length > 4 ? "…" : ""}.`,
    );
  }
  if (uniqueToA.length > 0) {
    summaryParts.push(`Only in ${labelA}: ${uniqueToA.join(", ")}.`);
  }
  if (uniqueToB.length > 0) {
    summaryParts.push(`Only in ${labelB}: ${uniqueToB.join(", ")}.`);
  }
  if (summaryParts.length === 0) {
    summaryParts.push(
      "Both paths cover similar categories — compare reasons and estimated prices row by row.",
    );
  }

  return {
    overlapCategories,
    uniqueToA,
    uniqueToB,
    priceGap,
    summary: summaryParts.join(" "),
  };
}
