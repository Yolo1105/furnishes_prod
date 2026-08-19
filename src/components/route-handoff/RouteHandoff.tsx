"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { registerRouteHandoff } from "./start-route-handoff";
import {
  PEACH_HANDOFF_BG,
  handoffCoverColor,
  paintDocumentBg,
  routePainted,
  shouldHandoff,
} from "./route-handoff-logic";
import styles from "./route-handoff.module.css";

const COVER_MS = 280;
const PAINT_HOLD_MS = 8000;
const SAFETY_MS = 10000;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function arrivedAt(pathname: string, pending: string) {
  return pathname === pending;
}

/**
 * Colored cover on every cross-surface URL change so the previous page does
 * not drop into an unpainted (white) frame. Cover color matches the
 * destination. Click intercept covers Links; pathname watch covers Back.
 */
export function RouteHandoff({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const prevPathRef = useRef(pathname);
  const pendingToRef = useRef<string | null>(null);
  const lockRef = useRef(false);
  const [coverOn, setCoverOn] = useState(false);
  const [coverBg, setCoverBg] = useState(PEACH_HANDOFF_BG);
  pathnameRef.current = pathname;

  const armCover = useCallback((toPathname: string, fromPathname?: string) => {
    const bg = handoffCoverColor(
      toPathname,
      fromPathname ?? pathnameRef.current,
    );
    paintDocumentBg(bg);
    setCoverBg(bg);
    pendingToRef.current = toPathname;
    lockRef.current = true;
    setCoverOn(true);
    window.setTimeout(() => {
      if (!pendingToRef.current) return;
      pendingToRef.current = null;
      lockRef.current = false;
      setCoverOn(false);
    }, SAFETY_MS);
  }, []);

  const go = useCallback(
    (href: string, replace = false) => {
      const from = pathnameRef.current;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin) return false;
      if (!shouldHandoff(from, url.pathname)) return false;
      if (lockRef.current) return true;

      const to = `${url.pathname}${url.search}`;
      armCover(url.pathname, from);

      if (prefersReducedMotion()) {
        if (replace) router.replace(to);
        else router.push(to);
        return true;
      }

      window.setTimeout(() => {
        if (replace) router.replace(to);
        else router.push(to);
      }, COVER_MS);
      return true;
    },
    [armCover, router],
  );

  useEffect(() => {
    registerRouteHandoff(go);
    return () => registerRouteHandoff(null);
  }, [go]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;
      if (go(hrefAttr)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [go]);

  useLayoutEffect(() => {
    const from = prevPathRef.current;
    if (from !== pathname) {
      prevPathRef.current = pathname;
    }

    if (
      !pendingToRef.current &&
      from !== pathname &&
      shouldHandoff(from, pathname)
    ) {
      const bg = handoffCoverColor(pathname, from);
      paintDocumentBg(bg);
      setCoverBg(bg);
      if (!routePainted(pathname)) {
        armCover(pathname, from);
      }
    }

    const pending = pendingToRef.current;
    if (!pending) return;
    if (!arrivedAt(pathname, pending)) return;

    let cancelled = false;
    const release = () => {
      if (cancelled) return;
      pendingToRef.current = null;
      setCoverOn(false);
      lockRef.current = false;
    };

    const started = performance.now();
    const tick = () => {
      if (cancelled) return;
      if (routePainted(pathname)) {
        window.requestAnimationFrame(release);
        return;
      }
      if (performance.now() - started > PAINT_HOLD_MS) {
        release();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [armCover, pathname]);

  return (
    <>
      {children}
      <div
        className={`${styles.cover}${coverOn ? ` ${styles.coverOn}` : ""}`}
        style={{ backgroundColor: coverBg }}
        aria-hidden="true"
      />
    </>
  );
}
