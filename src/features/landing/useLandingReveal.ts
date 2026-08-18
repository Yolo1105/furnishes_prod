"use client";

import { useEffect, type RefObject } from "react";

/**
 * Per-section scroll reveal: when a section enters view, its `.reveal` items
 * cascade with a small stagger (matches the frozen reference).
 *
 * Uses a data attribute in addition to the `revealIn` class so React className
 * updates (e.g. active service / team row) cannot wipe the revealed state.
 */
export function useLandingReveal(
  rootRef: RefObject<HTMLElement | null>,
  revealClass: string,
  inClass: string,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;

    const REVEALED_ATTR = "data-landing-revealed";
    const timers = new Set<number>();
    const schedule = (cb: () => void, delay: number) => {
      const t = window.setTimeout(() => {
        timers.delete(t);
        cb();
      }, delay);
      timers.add(t);
    };

    const markRevealed = (el: HTMLElement, delay: number) => {
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add(inClass);
      el.setAttribute(REVEALED_ATTR, "");
      schedule(() => {
        el.style.transitionDelay = "";
      }, delay + 900);
    };

    const els = root.querySelectorAll<HTMLElement>(`.${revealClass}`);
    const STAGGER = 90;
    const MAX_STEPS = 6;
    const groupOf = (el: Element) =>
      el.closest("section, footer") || el.parentElement;

    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .filter((el) => !el.hasAttribute(REVEALED_ATTR));
        if (!entering.length) return;
        entering.forEach((el) => io.unobserve(el));
        entering.sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1,
        );
        const stepByGroup = new Map<Element | null, number>();
        entering.forEach((el) => {
          const g = groupOf(el);
          const step = stepByGroup.get(g) || 0;
          stepByGroup.set(g, step + 1);
          const delay = Math.min(step, MAX_STEPS) * STAGGER;
          markRevealed(el, delay);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    els.forEach((el) => {
      if (el.hasAttribute(REVEALED_ATTR)) {
        el.classList.add(inClass);
        return;
      }
      io.observe(el);
    });
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, [rootRef, revealClass, inClass]);
}
