"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * LIFO Escape ownership across stacked Account overlays.
 * Capture-phase listeners register oldest-first, so only the stack top
 * may close — older overlays must not call stopImmediatePropagation.
 */
const escapeOwnerStack: Array<() => void> = [];

function focusablesIn(el: HTMLElement | null): HTMLElement[] {
  if (!el) return [];
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) =>
      !node.hasAttribute("disabled") &&
      node.tabIndex !== -1 &&
      !node.closest("[inert]"),
  );
}

/**
 * Shared Account overlay behavior: focus trap, Escape, inert background,
 * body scroll lock, and focus restoration. Appearance stays caller-owned.
 *
 * Inert cleanup preserves targets that were already inert when this overlay
 * opened, so stacked overlays (e.g. Eva panel → modal) do not unlock early.
 */
export function useAccountOverlay({
  open,
  onClose,
  panelRef,
  initialFocusRef,
  restoreFocusRef,
  inertTargets,
}: {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  /** Elements outside the overlay that should become inert while open. */
  inertTargets?: Array<RefObject<HTMLElement | null> | HTMLElement | null>;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      restoreFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const resolvedInert = (inertTargets ?? [])
      .map((target) =>
        target && "current" in target ? target.current : target,
      )
      .filter(Boolean) as HTMLElement[];

    const inertStates = resolvedInert.map((element) => ({
      element,
      wasInert: element.hasAttribute("inert"),
    }));
    for (const { element } of inertStates) {
      element.setAttribute("inert", "");
    }

    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      if (preferred) {
        preferred.focus();
        return;
      }
      const first = focusablesIn(panelRef.current)[0];
      first?.focus();
    };
    const frame = window.requestAnimationFrame(focusInitial);

    const closeOwner = () => {
      onCloseRef.current();
    };
    escapeOwnerStack.push(closeOwner);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (escapeOwnerStack[escapeOwnerStack.length - 1] !== closeOwner) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        closeOwner();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusablesIn(panelRef.current);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
      const ownerIndex = escapeOwnerStack.lastIndexOf(closeOwner);
      if (ownerIndex >= 0) escapeOwnerStack.splice(ownerIndex, 1);
      document.body.style.overflow = previousOverflow;
      for (const { element, wasInert } of inertStates) {
        if (!wasInert) element.removeAttribute("inert");
      }
      const restore = previouslyFocused.current;
      if (
        restore &&
        document.contains(restore) &&
        restore.getClientRects().length > 0
      ) {
        restore.focus();
      }
    };
  }, [open, panelRef, initialFocusRef, restoreFocusRef, inertTargets]);
}
