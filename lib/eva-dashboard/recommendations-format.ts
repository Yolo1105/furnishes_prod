import type { BudgetBreakdownLine } from "@/lib/eva-dashboard/conversation-output-types";

/** Render one budget row from API JSON (honest fallback for unknown shapes). */
export function formatBudgetBreakdownLine(val: unknown): string {
  if (typeof val === "object" && val !== null) {
    const o = val as BudgetBreakdownLine;
    if (o.range?.trim()) return o.range.trim();
    if (o.amount != null) return `$${o.amount}`;
    if (o.notes?.trim()) return o.notes.trim();
    return "";
  }
  return String(val);
}
