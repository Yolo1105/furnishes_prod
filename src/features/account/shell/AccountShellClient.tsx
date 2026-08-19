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
import { ChatWorkspaceProvider } from "../conversations/chat-workspace-context";
import { AccountRail } from "./AccountRail";
import { AccountDocumentPaint } from "./AccountDocumentPaint";
import { isCanvasPath, isChatPath } from "./account-navigation";
import {
  AccountShellUserProvider,
  type AccountShellUser,
} from "./account-shell-user";
import { QuizResultAccountHandoff } from "./QuizResultAccountHandoff";

const VIEW_FADE_OUT_MS = 480;
const VIEW_FADE_IN_MS = 620;

/**
 * Route-owned Account chrome.
 * Account-to-account motion lives on the right stage only (rail stays still).
 * Landing ↔ login/account still uses RouteHandoff.
 */
export function AccountShellClient({
  user,
  children,
  className,
  commerceEnabled,
}: {
  user: AccountShellUser;
  children: ReactNode;
  className?: string;
  commerceEnabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  const prevPathnameRef = useRef(pathname);
  const lockRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "out" | "hold" | "in">("idle");
  const [sweepId, setSweepId] = useState(0);
  pathnameRef.current = pathname;

  const prefersReduced = useCallback(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const go = useCallback(
    (href: string) => {
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin) return false;
      if (!url.pathname.startsWith("/account")) return false;
      const from = pathnameRef.current;
      if (motionViewKey(from) === motionViewKey(url.pathname)) return false;
      if (prefersReduced()) return false;
      if (lockRef.current) return true;

      lockRef.current = true;
      pendingRef.current = url.pathname;
      setSweepId((id) => id + 1);
      setPhase("out");
      window.setTimeout(() => {
        setPhase("hold");
        router.push(`${url.pathname}${url.search}`);
      }, VIEW_FADE_OUT_MS);
      return true;
    },
    [prefersReduced, router],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
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
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [go]);

  useLayoutEffect(() => {
    const prev = prevPathnameRef.current;
    if (prev === pathname) return;
    prevPathnameRef.current = pathname;

    if (motionViewKey(prev) === motionViewKey(pathname)) {
      lockRef.current = false;
      pendingRef.current = null;
      setPhase("idle");
      return;
    }

    const pending = pendingRef.current;
    if (pending && pathname === pending) {
      pendingRef.current = null;
      lockRef.current = false;
      setPhase("in");
      return;
    }

    pendingRef.current = null;
    lockRef.current = false;
    setSweepId((id) => id + 1);
    setPhase("in");
  }, [pathname]);

  useEffect(() => {
    if (phase !== "in") return;
    const timer = window.setTimeout(() => {
      setPhase("idle");
    }, VIEW_FADE_IN_MS + 40);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const stageClass =
    phase === "out"
      ? "stage is-route-out"
      : phase === "hold"
        ? "stage is-route-hold"
        : phase === "in"
          ? "stage is-route-in"
          : "stage";

  // Canvas is the standalone playground — full viewport, no Account rail.
  if (isCanvasPath(pathname)) {
    return (
      <AccountShellUserProvider user={user}>
        {children}
      </AccountShellUserProvider>
    );
  }

  return (
    <AccountShellUserProvider user={user}>
      <ChatWorkspaceProvider>
        <AccountDocumentPaint />
        <div
          ref={rootRef}
          className={["furnishes-account", className].filter(Boolean).join(" ")}
          data-surface="account"
          data-route-paint="account"
          data-route-path={pathname}
        >
          <div className="app">
            <div className="headrule" aria-hidden="true" />
            <AccountRail user={user} commerceEnabled={commerceEnabled} />
            <section className={stageClass} id="account-main">
              <div className="route-sweep" aria-hidden="true">
                {sweepId > 0 ? <i key={sweepId} /> : null}
              </div>
              {children}
            </section>
          </div>
          <QuizResultAccountHandoff />
        </div>
      </ChatWorkspaceProvider>
    </AccountShellUserProvider>
  );
}

function motionViewKey(pathname: string): string {
  if (isChatPath(pathname)) return "chat";
  if (
    pathname === "/account/image-generation" ||
    pathname.startsWith("/account/image-generation/")
  ) {
    return "image-generation";
  }
  return pathname;
}
