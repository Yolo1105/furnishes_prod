// Scene-context serializer + action validator. Two responsibilities:
//
//   1. `buildSceneContext` — turn the current store state into the
//      compact text payload Claude receives as the user message.
//      Includes placed items (id, label, dimensions) and apartment
//      bounds when available. Compact format saves tokens.
//
//   2. `validateActions` — given the model's parsed actions and the
//      current furniture list, partition them into `valid` (will be
//      applied) and `rejected` (will be reported). Rejection reasons:
//      unknown item id, out-of-range coordinates.
//
// Adapted from the zip's lib/ai/validate.ts. The signatures match the
// zip so future ports of the planner / arrange flow drop in cleanly.

import type { AIAction } from "./schema";
import type { PlacedItem } from "@studio/store/furniture-slice";

const MAX_COORD = 50; // meters — apartment-relative; rejects nonsense numbers

export interface ValidationResult {
  valid: AIAction[];
  rejected: Array<{ action: AIAction; reason: string }>;
}

/** Serialize the scene state into a compact string the model can
 *  read. The shape is deliberately minimal — we only include fields
 *  the model needs to ground its actions: id, label, footprint
 *  dimensions. Position/rotation aren't included today because our
 *  slice doesn't track them yet (Phase C2 is reverted); when items
 *  gain x/z/rotation, this function will append them. */
export function buildSceneContext(
  furniture: readonly PlacedItem[],
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number } | null,
): string {
  const placed = furniture.filter((f) => f.placed);
  if (placed.length === 0) {
    return "(empty room — no furniture currently placed)";
  }

  const lines: string[] = [];
  lines.push(`Items currently placed (${placed.length}):`);
  for (const f of placed) {
    // Format: id · label · WxD m · visible/hidden
    const visMark = f.visible ? "" : " (hidden)";
    lines.push(
      `  ${f.id} · ${f.label} · ${f.width.toFixed(2)}×${f.depth.toFixed(2)}m${visMark}`,
    );
  }
  if (bounds) {
    lines.push("");
    lines.push(
      `Room bounds: minX=${bounds.minX.toFixed(2)}, maxX=${bounds.maxX.toFixed(2)}, minZ=${bounds.minZ.toFixed(2)}, maxZ=${bounds.maxZ.toFixed(2)}`,
    );
    lines.push(
      "(left wall = minX, right wall = maxX, front wall = minZ, back wall = maxZ)",
    );
  }
  return lines.join("\n");
}

/** Validate the actions the model produced. Each action is checked
 *  against the current furniture list (id must exist) and, for
 *  position-bearing actions, against MAX_COORD (sanity bound). */
export function validateActions(
  actions: readonly AIAction[],
  furniture: readonly PlacedItem[],
): ValidationResult {
  const byId = new Map(furniture.map((f) => [f.id, f] as const));
  const valid: AIAction[] = [];
  const rejected: Array<{ action: AIAction; reason: string }> = [];

  for (const a of actions) {
    if (!byId.has(a.id)) {
      rejected.push({ action: a, reason: `Unknown item id: ${a.id}` });
      continue;
    }
    if (a.type === "move") {
      if (Math.abs(a.x) > MAX_COORD || Math.abs(a.z) > MAX_COORD) {
        rejected.push({
          action: a,
          reason: `Coordinate out of range (|x|,|z| ≤ ${MAX_COORD})`,
        });
        continue;
      }
    }
    valid.push(a);
  }
  return { valid, rejected };
}
