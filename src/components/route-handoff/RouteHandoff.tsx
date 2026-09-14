"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { markLandingIntroSeen } from "@/features/landing/landing-intro";
import { registerRouteHandoff } from "./start-route-handoff";
import {
  PEACH_HANDOFF_BG,
  clearAuthScrollLock,
  clearQuizDocumentLock,
  handoffCoverColor,
  isAuthPath,
  isQuizPath,
  paintDocumentBg,
  routePainted,
  shouldHandoff,
} from "./route-handoff-logic";
import styles from "./route-handoff.module.css";

const PAINT_HOLD_MS = 8000;
const SAFETY_MS = 10000;

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
  const safetyTimerRef = useRef<number | null>(null);
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
    window.dispatchEvent(new Event("furnishes:route-handoff-start"));
    const from = fromPathname ?? pathnameRef.current;
    if (isAuthPath(from)) {
      clearAuthScrollLock();
    }
    if (isQuizPath(from)) {
      markLandingIntroSeen();
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = window.setTimeout(() => {
      pendingToRef.current = null;
      lockRef.current = false;
      setCoverOn(false);
      safetyTimerRef.current = null;
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

      // Paint the cover before push. A delayed timer used to be cleared on
      // remount, which preventDefault'd the quiz wordmark and left CI on /quiz.
      const to = `${url.pathname}${url.search}`;
      flushSync(() => {
        armCover(url.pathname, from);
      });
      if (replace) router.replace(to);
      else router.push(to);
      return true;
    },
    [armCover, router],
  );

  useEffect(() => {
    registerRouteHandoff(go);
    return () => registerRouteHandoff(null);
  }, [go]);

  useEffect(() => {
    return () => {
      if (safetyTimerRef.current !== null) {
        window.clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }
    };
  }, []);

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
      if (isQuizPath(from)) {
        clearQuizDocumentLock();
      }
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
        id="furnishes-route-handoff-cover"
        data-route-handoff={coverOn ? "on" : "off"}
        aria-hidden="true"
      />
    </>
  );
}
