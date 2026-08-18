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
import styles from "./route-handoff.module.css";

const COVER_MS = 280;
const PEACH = "#fff2e5";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isHandoffHref(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/quiz" ||
    pathname.startsWith("/account")
  );
}

function arrivedAt(pathname: string, pending: string) {
  return pathname === pending;
}

function shouldHandoff(from: string, to: string) {
  if (from === to) return false;
  const fromHome = from === "/";
  const toHome = to === "/";
  if (fromHome && isHandoffHref(to)) return true;
  if (toHome && isHandoffHref(from)) return true;
  if (isHandoffHref(from) && isHandoffHref(to) && from !== to) {
    const fromAuth = !from.startsWith("/account");
    const toAccount = to.startsWith("/account");
    return fromAuth && toAccount;
  }
  return false;
}

/**
 * Peach cover between landing ↔ login / account so the orange house does not
 * snap off into a blank frame.
 */
export function RouteHandoff({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const pendingToRef = useRef<string | null>(null);
  const lockRef = useRef(false);
  const [coverOn, setCoverOn] = useState(false);
  pathnameRef.current = pathname;

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
      const to = `${url.pathname}${url.search}`;
      if (!shouldHandoff(from, url.pathname)) return false;
      if (lockRef.current) return true;

      if (prefersReducedMotion()) {
        if (replace) router.replace(to);
        else router.push(to);
        return true;
      }

      lockRef.current = true;
      pendingToRef.current = url.pathname;
      setCoverOn(true);
      window.setTimeout(() => {
        if (replace) router.replace(to);
        else router.push(to);
      }, COVER_MS);
      window.setTimeout(() => {
        if (!pendingToRef.current) return;
        pendingToRef.current = null;
        lockRef.current = false;
        setCoverOn(false);
      }, 4000);
      return true;
    },
    [router],
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
    const pending = pendingToRef.current;
    if (!pending) return;
    if (!arrivedAt(pathname, pending)) return;
    pendingToRef.current = null;
    const hold = window.setTimeout(() => {
      setCoverOn(false);
      lockRef.current = false;
    }, 180);
    return () => window.clearTimeout(hold);
  }, [pathname]);

  return (
    <>
      {children}
      <div
        className={`${styles.cover}${coverOn ? ` ${styles.coverOn}` : ""}`}
        style={{ backgroundColor: PEACH }}
        aria-hidden="true"
      />
    </>
  );
}
