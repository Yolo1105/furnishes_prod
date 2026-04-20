"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { NAV_WARM_DARK, NAV_WARM_MUTED } from "@/content/site/nav-warm";
import {
  LANDING_SECTION_IDS,
  LANDING_SECTIONS,
} from "@/content/site/landing-sections";
import { getSidebarNavTone } from "@/lib/site/landing-nav-tone";

let raf = 0;

function smoothScrollTo(y: number, ms = 900) {
  cancelAnimationFrame(raf);
  const start = window.scrollY;
  const delta = y - start;
  if (Math.abs(delta) < 1) return;

  let t0: number | null = null;
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

  function tick(now: number) {
    t0 ??= now;
    const p = Math.min((now - t0) / ms, 1);
    window.scrollTo(0, start + delta * ease(p));
    if (p < 1) raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
}

/**
 * Horizontal scan line in the viewport (fraction of inner height from top).
 */
const SCROLL_SPY_LINE_FRAC = 0.38;

/**
 * Pick the section whose **full box height** contains the scan line in document space — not “last
 * section whose top is above the line”, which mislabels short blocks (e.g. #About vs #Experience).
 */
function pickActiveSectionId(idList: string[]): string {
  const vh = window.innerHeight;
  const lineY = vh * SCROLL_SPY_LINE_FRAC;
  const probeDocY = window.scrollY + lineY;

  for (const id of idList) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const topDoc = rect.top + window.scrollY;
    const bottomDoc = topDoc + rect.height;
    if (probeDocY >= topDoc && probeDocY < bottomDoc) {
      return id;
    }
  }

  /* Gaps / edges: fall back to last section whose top is at or above the scan line (viewport px) */
  let fallback = idList[0] ?? "";
  for (const id of idList) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= lineY) fallback = id;
  }
  return fallback;
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  const idsKey = useMemo(() => ids.join("|"), [ids]);

  useEffect(() => {
    const idList = idsKey.split("|").filter(Boolean);
    if (idList.length === 0) return;

    const compute = () => {
      const current = pickActiveSectionId(idList);
      setActive((a) => (a === current ? a : current));
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [idsKey]);

  return active;
}

export type SidebarSection = { id: string; label: string };

export interface SidebarNavProps {
  /** Defaults to landing sections (About shows “WHO ARE WE”, id stays `About`). */
  sections?: readonly SidebarSection[];
  /** Called before smooth-scroll (e.g. skip About scroll-fill lock when using nav). */
  onBeforeNavigate?: () => void;
  /**
   * `landing` — Home rail: reveal after #About, tone follows scroll.
   * `product` — PDP rail: always visible, dark labels on cream (no Home/About logic).
   */
  mode?: "landing" | "product";
  /** Overrides default `aria-label` on the `<nav>`. */
  ariaLabel?: string;
}

/** Gap (px) between rail bottom and footer top once the footer enters the viewport. */
const FOOTER_RAIL_GAP = 16;
const RAIL_BOTTOM_DEFAULT = 36;

/** Fade rail in only after #About (“WHO ARE WE”) has entered the viewport; stays on for lower sections. */
const ABOUT_SECTION_ID = "About";

function useSidebarRevealAfterAbout() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const compute = () => {
      const about = document.getElementById(ABOUT_SECTION_ID);
      if (!about) {
        setVisible(false);
        return;
      }
      const topDoc = about.getBoundingClientRect().top + window.scrollY;
      const entered = window.scrollY + window.innerHeight > topDoc;
      setVisible((v) => (v === entered ? v : entered));
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  return visible;
}

/** Light on Home; dark from About through footer (rail stays above footer). */
function useSidebarScrollTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const firstId = LANDING_SECTION_IDS[0];

  useEffect(() => {
    const update = () => {
      setTheme(getSidebarNavTone(firstId));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [firstId]);

  return theme;
}

/**
 * Ease the rail upward with `translateY` (not `bottom`) for compositor-smooth motion.
 * Target matches footer clearance; rAF loop interpolates so it feels sticky, not stepped per scroll.
 */
function useSidebarFooterLift(navRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const navForCleanup = navRef.current;
    const liftPx = { current: 0 };
    let rafId = 0;

    const targetLift = () => {
      const footer = document.getElementById("site-footer");
      const vh = window.innerHeight;
      if (!footer) return 0;
      const ft = footer.getBoundingClientRect().top;
      if (ft >= vh) return 0;
      const desiredBottom = Math.max(
        RAIL_BOTTOM_DEFAULT,
        vh - ft + FOOTER_RAIL_GAP,
      );
      return desiredBottom - RAIL_BOTTOM_DEFAULT;
    };

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ease = prefersReduced ? 1 : 0.22;

    const tick = () => {
      rafId = 0;
      const target = targetLift();
      const cur = liftPx.current;
      const next = cur + (target - cur) * ease;
      liftPx.current = Math.abs(target - next) < 0.35 ? target : next;
      const el = navRef.current;
      if (el) {
        el.style.transform =
          liftPx.current > 0 ? `translate3d(0, ${-liftPx.current}px, 0)` : "";
      }
      if (!prefersReduced && Math.abs(liftPx.current - target) > 0.4) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const kick = () => {
      if (rafId === 0) rafId = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      if (rafId) cancelAnimationFrame(rafId);
      if (navForCleanup) navForCleanup.style.transform = "";
    };
  }, [navRef]);
}

export function SidebarNav({
  sections = LANDING_SECTIONS,
  onBeforeNavigate,
  mode = "landing",
  ariaLabel = "Section",
}: SidebarNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const active = useScrollSpy(sectionIds);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const landingScrollTheme = useSidebarScrollTheme();
  const scrollTheme = mode === "product" ? "dark" : landingScrollTheme;
  useSidebarFooterLift(navRef);
  const revealAfterAbout = useSidebarRevealAfterAbout();
  const railVisible = mode === "product" ? true : revealAfterAbout;

  const visualActive = hoveredId ?? active;

  const handleClick = useCallback(
    (id: string) => {
      onBeforeNavigate?.();
      const el = document.getElementById(id);
      if (!el) return;
      smoothScrollTo(el.getBoundingClientRect().top + window.scrollY);
    },
    [onBeforeNavigate],
  );

  return (
    <nav
      ref={navRef}
      className="__sn"
      aria-label={ariaLabel}
      data-mode={mode}
      data-scroll-theme={scrollTheme}
      data-rail-visible={String(railVisible)}
      aria-hidden={!railVisible}
      inert={!railVisible ? true : undefined}
    >
      <style>{`
        .__sn {
          position: fixed;
          left: 36px;
          bottom: ${RAIL_BOTTOM_DEFAULT}px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 0;
          font-family: var(--font-sans);
          will-change: transform, opacity;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.45s ease;
        }
        .__sn[data-rail-visible="true"] {
          opacity: 1;
          pointer-events: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .__sn {
            transition-duration: 0.01ms;
          }
        }
        @media (max-width: 768px) {
          .__sn[data-mode="product"] {
            display: none !important;
            pointer-events: none !important;
          }
        }
        .__sn-btn {
          all: unset;
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          gap: 4px;
          padding: 2px 0;
        }
        .__sn-bracket {
          flex-shrink: 0;
          color: var(--color-accent);
          font-size: 21px;
          font-weight: 400;
          line-height: 1;
          transition: text-shadow 0.32s ease, filter 0.32s ease;
        }
        .__sn[data-scroll-theme="light"] .__sn-bracket {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
        }
        .__sn[data-scroll-theme="dark"] .__sn-bracket {
          text-shadow: none;
          filter: none;
        }
        .__sn-label {
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 0.02em;
          transition:
            color 0.32s cubic-bezier(0.4, 0, 0.2, 1),
            font-size 0.22s ease,
            text-shadow 0.32s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .__sn[data-scroll-theme="light"] .__sn-label {
          color: var(--background);
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
        }
        .__sn[data-scroll-theme="light"] .__sn-label[data-active="false"] {
          opacity: 0.72;
        }
        .__sn[data-scroll-theme="light"] .__sn-label[data-active="true"] {
          font-size: 21px;
          opacity: 1;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
        }
        .__sn[data-scroll-theme="dark"] .__sn-label {
          color: ${NAV_WARM_MUTED};
          text-shadow: none;
        }
        .__sn[data-scroll-theme="dark"] .__sn-label[data-active="true"] {
          font-size: 21px;
          color: ${NAV_WARM_DARK};
          text-shadow: none;
        }
      `}</style>

      {sections.map(({ id, label }) => {
        const isOn = visualActive === id;
        const on = String(isOn);
        return (
          <button
            key={id}
            type="button"
            className="__sn-btn"
            onClick={() => handleClick(id)}
            onMouseEnter={() => setHoveredId(id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-current={isOn ? "location" : undefined}
          >
            {isOn && (
              <span className="__sn-bracket" aria-hidden>
                [
              </span>
            )}
            <span className="__sn-label" data-active={on}>
              {label}
            </span>
            {isOn && (
              <span className="__sn-bracket" aria-hidden>
                ]
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
