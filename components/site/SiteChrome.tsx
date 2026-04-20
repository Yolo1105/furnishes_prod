"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import styles from "./SiteChrome.module.css";

export const SITE_CHROME_SCROLL_AWAY = "site-chrome-scroll-away";

/** Routes where the top chrome hides while scrolling down and reappears when scrolling back up / to top. */
export function isScrollHideChromeRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/collections" || pathname.startsWith("/collections/"))
    return true;
  if (pathname === "/inspiration" || pathname.startsWith("/inspiration/"))
    return true;
  return false;
}

/**
 * Place as the first child of `#main`. Uses IntersectionObserver so hide/show works even when
 * `window.scrollY` does not update the way we expect (flex layouts, sub-scrollers, etc.).
 */
export function SiteChromeScrollSentinel() {
  const pathname = usePathname();
  const scrollHide = isScrollHideChromeRoute(pathname);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!scrollHide) {
      window.dispatchEvent(
        new CustomEvent(SITE_CHROME_SCROLL_AWAY, { detail: { away: false } }),
      );
      return;
    }

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const away = !entry.isIntersecting;
        window.dispatchEvent(
          new CustomEvent(SITE_CHROME_SCROLL_AWAY, { detail: { away } }),
        );
      },
      { root: null, rootMargin: "0px", threshold: 0 },
    );

    io.observe(el);

    return () => {
      io.disconnect();
      window.dispatchEvent(
        new CustomEvent(SITE_CHROME_SCROLL_AWAY, { detail: { away: false } }),
      );
    };
  }, [scrollHide, pathname]);

  return (
    <div
      ref={ref}
      className="pointer-events-none h-px w-full shrink-0"
      aria-hidden
    />
  );
}

/**
 * Fixed column for `UtilityBar` + `Header`. On collections / inspiration, translates up when the user
 * scrolls content so the sentinel leaves the viewport; returns when scrolling back to the top.
 */
export function SiteChrome({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const scrollHide = isScrollHideChromeRoute(pathname);
  const [hidden, setHidden] = useState(false);
  const scrollHideRef = useRef(scrollHide);

  useEffect(() => {
    scrollHideRef.current = scrollHide;
  }, [scrollHide]);

  useEffect(() => {
    startTransition(() => setHidden(false));
  }, [pathname]);

  useEffect(() => {
    const onAway = (e: Event) => {
      const ce = e as CustomEvent<{ away?: boolean }>;
      const away = !!ce.detail?.away;
      if (!scrollHideRef.current) {
        setHidden(false);
        return;
      }
      setHidden(away);
    };
    window.addEventListener(SITE_CHROME_SCROLL_AWAY, onAway);
    return () => window.removeEventListener(SITE_CHROME_SCROLL_AWAY, onAway);
  }, []);

  /** Sync before paint with the transform so padding vars don’t update one frame late (which made the slide look instant). */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!scrollHide || !hidden) {
      root.removeAttribute("data-site-chrome-collapsed");
    } else {
      root.setAttribute("data-site-chrome-collapsed", "true");
    }
  }, [scrollHide, hidden]);

  return (
    <div
      data-workspace-dock
      className={cn(
        scrollHide
          ? `fixed top-0 right-0 left-0 z-50 flex flex-col ${styles.shell} ${hidden ? styles.shellHidden : ""}`
          : "fixed top-0 right-0 left-0 z-50 flex flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}
