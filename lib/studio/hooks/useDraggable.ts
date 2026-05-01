import { useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { useStore } from "@studio/store";
import type { CardId, CardPosition } from "@studio/store/card-positions-slice";

/**
 * Make a card draggable with the mouse. Returns the props you should
 * spread onto the card's draggable surface (typically the whole
 * card or its header strip):
 *
 *   • `onMouseDown` — starts a drag that listens to mousemove +
 *                     mouseup on `document` so the user can drag past
 *                     the card edges without losing the gesture
 *   • `style`       — top/left overrides if the card has a stored
 *                     position; merge after the card's default top/
 *                     left so the override wins
 *
 * The hook persists the new {x,y} on the store after every move so
 * the position survives across re-renders. Drags do NOT start on
 * elements that opt out via `data-no-drag="true"` or any of their
 * children — that's how interactive children (buttons, inputs,
 * dropdowns) preserve their normal click behavior. Any element
 * tagged `data-drag-handle="true"` is allowed to drag even inside
 * a `data-no-drag` ancestor (used by the resize handle, which
 * coexists inside a draggable card body but has its own gesture).
 *
 * The drag uses raw mouse events rather than HTML5 drag-and-drop
 * because that API is meant for cross-element data transfer; we
 * only ever want to reposition within the same coordinate space,
 * and the raw approach gives us pixel-perfect control + no ghost
 * image flicker.
 */
export function useDraggable(cardId: CardId) {
  const position = useStore((s) => s.cardPositions[cardId]);
  const setCardPosition = useStore((s) => s.setCardPosition);

  // Track whether we're currently dragging — so that during a drag,
  // mouseup on the document commits the gesture even if the card
  // itself unmounts (it shouldn't, but defensive).
  const dragging = useRef(false);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      // Only react to primary-button drags.
      if (e.button !== 0) return;

      // Walk up from the click target. If we hit `data-no-drag` before
      // we reach the element with the handler, this drag is a no-op
      // — it's an interactive child like a button or input.
      let node: HTMLElement | null = e.target as HTMLElement;
      while (node && node !== e.currentTarget) {
        if (node.dataset.dragHandle === "true") {
          // A drag handle inside a no-drag ancestor wins — used by
          // the resize handle inside the reference card's body.
          return;
        }
        if (node.dataset.noDrag === "true") return;
        node = node.parentElement;
      }

      // Compute the card's current top-left in viewport coords.
      // We use getBoundingClientRect on the dragging element rather
      // than the stored position so the very first drag (which has
      // no stored position) starts from the CSS default.
      const rect = e.currentTarget.getBoundingClientRect();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startCardX = rect.left;
      const startCardY = rect.top;

      // We don't preventDefault yet — that would block button clicks
      // inside the card on a pure click. Only mark the gesture as a
      // real drag once the mouse has actually moved past a small
      // threshold; clicks below the threshold pass through to the
      // inner element's onClick normally.
      const DRAG_THRESHOLD = 4;
      let movedPastThreshold = false;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startMouseX;
        const dy = ev.clientY - startMouseY;

        if (
          !movedPastThreshold &&
          Math.abs(dx) < DRAG_THRESHOLD &&
          Math.abs(dy) < DRAG_THRESHOLD
        ) {
          return;
        }

        if (!movedPastThreshold) {
          movedPastThreshold = true;
          dragging.current = true;
          document.body.style.userSelect = "none";
          document.body.style.cursor = "grabbing";
        }

        // Clamp to the viewport so cards can't be dragged off-screen.
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;
        const next: CardPosition = {
          x: Math.max(0, Math.min(maxX, startCardX + dx)),
          y: Math.max(0, Math.min(maxY, startCardY + dy)),
        };
        setCardPosition(cardId, next);
      };

      const onUp = () => {
        dragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [cardId, setCardPosition],
  );

  /** Style override to apply when the card has a stored position. */
  const positionStyle: React.CSSProperties | undefined = position
    ? {
        top: position.y,
        left: position.x,
        right: "auto",
        bottom: "auto",
        transform: "none",
      }
    : undefined;

  return { onMouseDown, positionStyle };
}
