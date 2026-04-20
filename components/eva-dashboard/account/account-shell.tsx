"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AccountNavbar } from "./account-navbar";
import { AccountSidebar } from "./account-sidebar";
import { useOptionalSession } from "./session-context";

type Props = {
  /** @deprecated — pass via SessionProvider instead. Kept for backward compat. */
  userInitials?: string;
  /** @deprecated — pass via SessionProvider instead. Kept for backward compat. */
  counts?: Record<string, number>;
  /** @deprecated — pass via SessionProvider instead. Kept for backward compat. */
  cartCount?: number;
  children?: React.ReactNode;
  /** Optional right column (e.g. Eva chat on Image Gen). Desktop: last grid track; mobile: docked below main. */
  rightPanel?: React.ReactNode;
  /**
   * When set with `rightPanel`, splits the former single main into two columns (e.g. Image Gen
   * controls | inspect canvas). Desktop: `tool left | center | chat` (no account nav rail); mobile: stacked main then chat.
   */
  splitMain?: {
    left: React.ReactNode;
    center: React.ReactNode;
  };
};

export function AccountShell({
  userInitials: legacyInitials,
  counts: legacyCounts,
  cartCount: legacyCartCount,
  children,
  rightPanel,
  splitMain,
}: Props) {
  // Prefer context (the new pattern); fall back to legacy props if no provider
  const session = useOptionalSession();
  const userInitials = session?.user.initials ?? legacyInitials ?? "··";
  const counts = (session?.counts ?? legacyCounts ?? {}) as Record<
    string,
    number
  >;
  const cartCount = session?.cartCount ?? legacyCartCount ?? 0;

  /** Image Gen (and similar): tool left | tool center | Eva chat */
  const useSplitMain = Boolean(splitMain && rightPanel);

  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer whenever route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bg-muted flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      <AccountNavbar
        userInitials={userInitials}
        cartCount={cartCount}
        onMenuClick={() => setDrawerOpen(true)}
      />

      {/* Desktop + mobile layout — min-h-0 + minmax row so <main> gets a bounded height and can scroll */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-2 overflow-hidden p-2 px-4">
        {useSplitMain && splitMain ? (
          <>
            {/* Mobile — tool left | tool center stacked, then Eva chat */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 md:hidden">
              <main className="account-main-scroll border-border bg-card flex min-h-0 flex-1 flex-col overflow-hidden border">
                <div className="border-border max-h-[min(46vh,440px)] min-h-0 shrink-0 overflow-hidden border-b">
                  {splitMain.left}
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  {splitMain.center}
                </div>
              </main>
              <aside
                aria-label="Eva chat"
                className="border-border bg-card h-[min(40vh,320px)] min-h-[220px] shrink-0 overflow-hidden border"
              >
                {rightPanel}
              </aside>
            </div>

            {/* Desktop — same proportions as `/chatbot` DashboardLayout: w-64 | flex-1 | w-64 */}
            <div className="hidden h-full min-h-0 w-full gap-2 overflow-hidden md:flex md:flex-row">
              <aside
                aria-label="Image generation controls"
                className="eva-studio border-border bg-card flex h-full w-64 shrink-0 flex-col overflow-hidden border"
              >
                {splitMain.left}
              </aside>
              <main className="eva-studio account-main-scroll border-border bg-card min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-hidden border">
                {splitMain.center}
              </main>
              <aside
                aria-label="Eva chat"
                className="border-border bg-card flex h-full w-64 shrink-0 flex-col overflow-hidden border"
              >
                {rightPanel}
              </aside>
            </div>
          </>
        ) : (
          <>
            {/* Mobile — main + optional chat stack */}
            <div
              className={
                rightPanel
                  ? "flex min-h-0 flex-1 flex-col gap-2 md:hidden"
                  : "contents md:hidden"
              }
            >
              <main
                className={
                  rightPanel
                    ? "account-main-scroll border-border bg-card min-h-0 flex-1 overflow-x-hidden overflow-y-auto border"
                    : "account-main-scroll border-border bg-card h-full min-h-0 overflow-x-hidden overflow-y-auto border"
                }
              >
                {children}
              </main>
              {rightPanel ? (
                <aside
                  aria-label="Eva chat"
                  className="border-border bg-card h-[min(40vh,320px)] min-h-[220px] shrink-0 overflow-hidden border md:hidden"
                >
                  {rightPanel}
                </aside>
              ) : null}
            </div>

            {/* Desktop layout */}
            <div
              className={
                rightPanel
                  ? "hidden h-full min-h-0 grid-flow-col gap-2 md:grid md:grid-cols-[256px_minmax(0,1fr)_minmax(280px,320px)] md:grid-rows-[minmax(0,1fr)]"
                  : "hidden h-full min-h-0 grid-flow-col gap-2 md:grid md:grid-cols-[256px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
              }
            >
              <AccountSidebar counts={counts} />
              <main className="account-main-scroll border-border bg-card h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto border">
                {children}
              </main>
              {rightPanel ? (
                <aside
                  aria-label="Eva chat"
                  className="border-border bg-card h-full min-h-0 min-w-0 overflow-hidden border"
                >
                  {rightPanel}
                </aside>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Mobile drawer — off-canvas sidebar */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        counts={counts}
        cartCount={cartCount}
      />
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  counts,
  cartCount,
}: {
  open: boolean;
  onClose: () => void;
  counts: Record<string, number>;
  cartCount: number;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 cursor-pointer bg-black/30 transition-opacity md:hidden"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        className="fixed inset-y-0 left-0 z-50 flex h-full max-h-screen w-64 flex-col overflow-hidden shadow-lg transition-transform md:hidden"
        style={{
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <AccountSidebar counts={counts} />
      </aside>
    </>
  );
}
