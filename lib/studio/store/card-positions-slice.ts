import type { StateCreator } from "zustand";

/**
 * Per-card user-positioning state. Each draggable card has a stable
 * `cardId` (a kebab string — `project`, `tools`, `tool-reference`,
 * `tool-inventory`, `tool-generations`, etc). The first time the user
 * drags a card, we store its `{x, y}`. From then on the card uses the
 * stored position instead of its CSS default.
 *
 * Positions are kept in viewport pixel coordinates. They reset on
 * page reload (no persistence yet — adds itself naturally when the
 * project-state persistence layer lands).
 *
 * This slice is the single source of truth for floating-card
 * positions so any future card joins the drag system by:
 *   1. Picking a stable `cardId`.
 *   2. Calling `useDraggable(cardId)` for `onMouseDown` + the merged
 *      style overrides.
 */

export type CardId =
  | "project"
  | "tools"
  | "tool-reference"
  | "tool-catalog"
  | "tool-inventory"
  | "tool-generations"
  | "tool-chat-history"
  | "tool-starred"
  | "tool-properties"
  | "tool-room-grid";

export interface CardPosition {
  x: number;
  y: number;
}

export interface CardPositionsSlice {
  /** Map from CardId to its custom position. Missing entry = card
   *  is at its CSS default position. */
  cardPositions: Partial<Record<CardId, CardPosition>>;

  setCardPosition: (id: CardId, pos: CardPosition) => void;
  clearCardPosition: (id: CardId) => void;
}

export const createCardPositionsSlice: StateCreator<CardPositionsSlice> = (
  set,
) => ({
  cardPositions: {},

  setCardPosition: (id, pos) =>
    set((s) => ({
      cardPositions: { ...s.cardPositions, [id]: pos },
    })),

  clearCardPosition: (id) =>
    set((s) => {
      const next = { ...s.cardPositions };
      delete next[id];
      return { cardPositions: next };
    }),
});
