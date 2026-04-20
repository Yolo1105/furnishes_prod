"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";

/**
 * Routes where navigations tend to load larger bundles / RSC trees — show the sweep
 * when entering, leaving, or moving within these areas.
 *
 * Prefixes must be path segments (e.g. `/account`) so `/accounts` does not match.
 */
const HEAVY_ROUTE_PREFIXES: readonly string[] = [
  "/account",
  "/admin",
  "/cart",
  WORKFLOW_ROUTES.assistant,
  "/checkout",
  "/playground",
  "/quiz",
  "/shared",
  "/style",
] as const;

function pathMatchesHeavyPrefix(path: string): boolean {
  return HEAVY_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** True when this transition is worth a full progress sweep (large / app-like routes). */
export function isHeavyNavigation(fromPath: string, toPath: string): boolean {
  if (fromPath === toPath) return false;
  return pathMatchesHeavyPrefix(fromPath) || pathMatchesHeavyPrefix(toPath);
}

/**
 * RouteProgressSweep — global page-transition loader for heavy routes only.
 *
 * Mount ONCE in the root layout, just inside `<body>`, before `{children}`.
 */
export function RouteProgressSweep() {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const [tick, setTick] = useState(0);
  const isFirstRender = useRef(true);
  const prevPathRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPathRef.current = pathname;
      return;
    }

    const from = prevPathRef.current ?? pathname;
    const to = pathname;
    prevPathRef.current = pathname;

    if (!isHeavyNavigation(from, to)) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setTick((t) => t + 1);
    setIsAnimating(true);

    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 1200);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  if (!isAnimating) return null;

  return (
    <div
      key={tick}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        zIndex: 100,
        pointerEvents: "none",
        background: "color-mix(in srgb, var(--color-accent) 18%, transparent)",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "var(--color-accent)",
          animation:
            "furnishes-route-sweep 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          transformOrigin: "left center",
        }}
      />
      <style>{`
        @keyframes furnishes-route-sweep {
          0% {
            width: 0%;
            opacity: 1;
            transform: translateX(0);
          }
          60% {
            width: 90%;
            opacity: 1;
            transform: translateX(0);
          }
          75% {
            width: 100%;
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            width: 100%;
            opacity: 0;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
