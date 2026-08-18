/**
 * Deterministic room-type budget bands. No LLM.
 * Suggestions fill missing budgetCents; never invent spend.
 */

type RoomTypeBand = "living" | "bedroom" | "dining" | "generic";

type BudgetBand = {
  category: string;
  /** Inclusive lower fraction of cap (0–1). */
  minShare: number;
  /** Inclusive upper fraction of cap (0–1). */
  maxShare: number;
};

const ROOM_BUDGET_BANDS: Record<
  Exclude<RoomTypeBand, "generic">,
  BudgetBand[]
> = {
  living: [
    { category: "sofa", minShare: 0.3, maxShare: 0.4 },
    { category: "rug", minShare: 0.08, maxShare: 0.12 },
    { category: "media", minShare: 0.08, maxShare: 0.12 },
    { category: "lighting", minShare: 0.08, maxShare: 0.1 },
    { category: "tables", minShare: 0.1, maxShare: 0.15 },
  ],
  bedroom: [
    { category: "bed", minShare: 0.4, maxShare: 0.5 },
    { category: "storage", minShare: 0.15, maxShare: 0.2 },
    { category: "lighting", minShare: 0.08, maxShare: 0.1 },
    { category: "textiles", minShare: 0.08, maxShare: 0.12 },
  ],
  dining: [
    { category: "table", minShare: 0.35, maxShare: 0.45 },
    { category: "seating", minShare: 0.25, maxShare: 0.3 },
    { category: "lighting", minShare: 0.1, maxShare: 0.1 },
    { category: "storage", minShare: 0.1, maxShare: 0.15 },
  ],
};

type AllocatableItem = {
  id: string;
  category: string;
  priority: string;
  budgetCents: number | null;
};

type AllocationResult = {
  suggestions: Array<{ id: string; budgetCents: number }>;
  warnings: string[];
};

function normalizeRoomType(roomType: string | null | undefined): RoomTypeBand {
  const raw = roomType?.trim().toLowerCase() ?? "";
  if (raw.includes("bed")) return "bedroom";
  if (raw.includes("din")) return "dining";
  if (raw.includes("liv") || raw.includes("lounge") || raw.includes("family")) {
    return "living";
  }
  return "generic";
}

function midCents(capCents: number, band: BudgetBand): number {
  const share = (band.minShare + band.maxShare) / 2;
  return Math.round(capCents * share);
}

function matchBand(
  category: string,
  bands: BudgetBand[],
): BudgetBand | undefined {
  const lower = category.trim().toLowerCase();
  return bands.find(
    (band) =>
      lower === band.category ||
      lower.includes(band.category) ||
      band.category.includes(lower),
  );
}

/**
 * Fill missing `budgetCents` from room-type percentage bands.
 * Items that already have budgetCents are left unchanged.
 */
export function allocate(
  roomType: string | null | undefined,
  capCents: number,
  items: AllocatableItem[],
): AllocationResult {
  const warnings: string[] = [];
  const suggestions: Array<{ id: string; budgetCents: number }> = [];

  if (!(capCents > 0)) {
    warnings.push("Budget cap is missing or zero; no allocations suggested.");
    return { suggestions, warnings };
  }

  const kind = normalizeRoomType(roomType);
  const bands =
    kind === "generic" ? ([] as BudgetBand[]) : ROOM_BUDGET_BANDS[kind];

  if (bands.length === 0) {
    warnings.push(
      "Room type has no dedicated bands; leaving item budgets unchanged.",
    );
    return { suggestions, warnings };
  }

  let allocated = 0;
  for (const item of items) {
    if (item.budgetCents != null && item.budgetCents > 0) {
      allocated += item.budgetCents;
      continue;
    }
    const band = matchBand(item.category, bands);
    if (!band) continue;
    const cents = midCents(capCents, band);
    suggestions.push({ id: item.id, budgetCents: cents });
    allocated += cents;
  }

  if (allocated > capCents) {
    warnings.push("Suggested allocations exceed the budget cap.");
  }

  const anchor = bands[0];
  if (anchor) {
    const spendById = new Map<string, number>();
    for (const item of items) {
      if (matchBand(item.category, [anchor]) && item.budgetCents != null) {
        spendById.set(item.id, item.budgetCents);
      }
    }
    for (const suggestion of suggestions) {
      const item = items.find((row) => row.id === suggestion.id);
      if (item && matchBand(item.category, [anchor])) {
        spendById.set(item.id, suggestion.budgetCents);
      }
    }
    const anchorSpend = [...spendById.values()].reduce((sum, n) => sum + n, 0);
    const minAnchor = Math.round(capCents * anchor.minShare);
    if (anchorSpend > 0 && anchorSpend < minAnchor) {
      warnings.push(
        `Anchor category "${anchor.category}" is underfunded relative to the band.`,
      );
    }
  }

  const coreWithoutBudget = items.filter(
    (item) =>
      item.priority === "core" &&
      (item.budgetCents == null || item.budgetCents <= 0) &&
      !suggestions.some((suggestion) => suggestion.id === item.id),
  );
  if (coreWithoutBudget.length > 0) {
    warnings.push(
      `${coreWithoutBudget.length} core item(s) have no matching budget band.`,
    );
  }

  return { suggestions, warnings };
}
