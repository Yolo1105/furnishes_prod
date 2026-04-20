"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type MouseEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PanelId, SidebarContextValue } from "./types";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";
import {
  WorkspaceRailHoverProvider,
  type WorkspaceRailHoverHandlers,
} from "./workspace-rail-hover";

// ── Timing ────────────────────────────────────────────────────────────────────

/** Must match `:root --fur-panel-slide-ms` in `app/globals.css` (parseInt ms). */
const PANEL_MS = 450;
const STAGGER_MS = 60; // between each rail icon
const ICON_DUR_MS = 320; // per-icon animation duration
const ICON_COUNT = 9;
/** Total time for all rail icons to finish their stagger animation */
const RAIL_ANIM_MS = (ICON_COUNT - 1) * STAGGER_MS + ICON_DUR_MS + 80;

const AUTO_REVEAL_ROUTES = ["/style", "/budget"];

/** Delay before collapsing when pointer leaves the dock (chrome ↔ rail gap). */
const HOVER_LEAVE_MS = 220;
/** After intentional full collapse (trigger or same-icon close), ignore rail/panel hover briefly so the pointer sitting on an icon cannot re-open the dock. */
const RAIL_ENTER_SUPPRESS_MS = 520;

/** Pointer moved to another part of the fixed workspace (chrome, panel, rail) — do not treat as “left the dock”. */
function stillWithinWorkspaceDock(related: EventTarget | null) {
  if (!related || !(related instanceof Element)) return false;
  return !!related.closest("[data-workspace-dock]");
}

// ── Context ───────────────────────────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>");
  return ctx;
}

/** For chrome (`Header`, etc.) that may render without `SidebarProvider` on some routes. */
export function useSidebarOptional(): SidebarContextValue | null {
  return useContext(SidebarContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // ── Visual / interaction state ───────────────────────────────────────────
  const [railVisible, setRailVisible] = useState(false);
  const [railDismissing, setRailDismissing] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  /**
   * railInstantHide is ONLY set during the F transition (trigger collapses
   * everything from state 3). It applies a CSS class that forces opacity:0
   * with transition:none on ALL rail buttons — so they vanish instantly
   * without any stagger-exit animation as the panel slides away.
   * Without this, bottom icons (stagger delay ~540ms+) are still fading out
   * AFTER the panel has fully exited at 450ms, causing a visible flash.
   */
  const [railInstantHide, setRailInstantHide] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  /** Slide-out phase: keep white panel surface until transform animation completes. */
  const [panelClosing, setPanelClosing] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [contentFading, setContentFading] = useState(false);

  // ── Stable refs — always hold latest values (no stale closures) ──────────
  const railRef = useRef(false);
  const panelRef = useRef(false);
  const activeRef = useRef<PanelId | null>(null);
  useEffect(() => {
    railRef.current = railVisible;
  }, [railVisible]);
  useEffect(() => {
    panelRef.current = panelOpen;
  }, [panelOpen]);
  useEffect(() => {
    activeRef.current = activePanel;
  }, [activePanel]);

  // ── Two independent locks — trigger and panel never block each other ─────
  /**
   * triggerLocked: blocks the trigger BUTTON only.
   * Icon clicks are NEVER affected by this lock — they always respond immediately.
   */
  const triggerLocked = useRef(false);
  /**
   * panelLocked: prevents double-clicking the same icon to close during the
   * 450ms panel-close animation (D transition).
   */
  const panelLocked = useRef(false);

  // ── Two independent timers — different animations can't cancel each other ─
  const triggerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Skips `onRailDockEnter` (rail + slide-out panel) right after a deliberate full dock collapse. */
  const railEnterSuppressRef = useRef(false);
  /** Separate from `triggerTimer` — `scheduleTrigger` must not cancel the suppress timeout. */
  const railEnterSuppressTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  /** Set with `panelClosing` in `fullCollapse` / `expandEva` — blocks duplicate collapse + bogus rail leave during exit. */
  const panelExitAnimatingRef = useRef(false);

  const clearHoverLeaveTimer = useCallback(() => {
    if (hoverLeaveTimerRef.current) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearHoverLeaveTimer();
    },
    [clearHoverLeaveTimer],
  );

  const armRailEnterSuppress = useCallback(() => {
    if (railEnterSuppressTimerRef.current) {
      clearTimeout(railEnterSuppressTimerRef.current);
      railEnterSuppressTimerRef.current = null;
    }
    railEnterSuppressRef.current = true;
    railEnterSuppressTimerRef.current = setTimeout(() => {
      railEnterSuppressTimerRef.current = null;
      railEnterSuppressRef.current = false;
    }, RAIL_ENTER_SUPPRESS_MS);
  }, []);

  useEffect(
    () => () => {
      if (railEnterSuppressTimerRef.current) {
        clearTimeout(railEnterSuppressTimerRef.current);
      }
    },
    [],
  );

  const scheduleTrigger = useCallback((ms: number, fn: () => void) => {
    if (triggerTimer.current) clearTimeout(triggerTimer.current);
    triggerTimer.current = setTimeout(fn, ms);
  }, []);

  /**
   * F / D / hover-leave (panel): instant-hide icons, slide panel closed, then hide rail.
   * `suppressRailEnter: false` when the pointer already left the dock — no bogus re-hover.
   */
  const fullCollapsePanelAndRail = useCallback(
    (opts?: { suppressRailEnter?: boolean }) => {
      if (panelExitAnimatingRef.current) return;
      const suppressRailEnter = opts?.suppressRailEnter !== false;
      clearHoverLeaveTimer();
      if (suppressRailEnter) {
        armRailEnterSuppress();
      }
      panelExitAnimatingRef.current = true;
      triggerLocked.current = true;
      setRailInstantHide(true);
      setPanelClosing(true);
      setPanelOpen(false);
      scheduleTrigger(PANEL_MS, () => {
        panelExitAnimatingRef.current = false;
        setPanelClosing(false);
        setActivePanel(null);
        setRailCollapsed(false);
        setRailInstantHide(false);
        setRailVisible(false);
        triggerLocked.current = false;
        panelLocked.current = false;
      });
    },
    [armRailEnterSuppress, clearHoverLeaveTimer, scheduleTrigger],
  );

  /**
   * After leaving the rail/panel/chrome dock (debounced): hide the rail, or — if a
   * drawer is open — fully collapse panel + rail so the pointer need not hit the
   * same icon again.
   */
  const runHoverDockCollapse = useCallback(() => {
    clearHoverLeaveTimer();
    if (triggerLocked.current) return;
    if (panelExitAnimatingRef.current) return;
    if (panelRef.current) {
      fullCollapsePanelAndRail();
      return;
    }

    if (railRef.current) {
      triggerLocked.current = true;
      setRailDismissing(true);
      scheduleTrigger(RAIL_ANIM_MS, () => {
        setRailVisible(false);
        setRailDismissing(false);
        triggerLocked.current = false;
      });
    }
  }, [clearHoverLeaveTimer, fullCollapsePanelAndRail, scheduleTrigger]);

  const scheduleHoverDockCollapse = useCallback(() => {
    clearHoverLeaveTimer();
    hoverLeaveTimerRef.current = setTimeout(() => {
      hoverLeaveTimerRef.current = null;
      runHoverDockCollapse();
    }, HOVER_LEAVE_MS);
  }, [clearHoverLeaveTimer, runHoverDockCollapse]);

  const onProfileDockEnter = useCallback(() => {
    clearHoverLeaveTimer();
    if (panelRef.current) return;
    setRailDismissing(false);
    setRailVisible(true);
  }, [clearHoverLeaveTimer]);

  const onChromeDockEnter = useCallback(() => {
    clearHoverLeaveTimer();
  }, [clearHoverLeaveTimer]);

  const onChromeDockLeave = useCallback(
    (e?: MouseEvent) => {
      if (e && stillWithinWorkspaceDock(e.relatedTarget)) return;
      scheduleHoverDockCollapse();
    },
    [scheduleHoverDockCollapse],
  );

  const onRailDockEnter = useCallback(() => {
    clearHoverLeaveTimer();
    if (panelRef.current) return;
    if (railEnterSuppressRef.current) return;
    setRailDismissing(false);
    setRailVisible(true);
  }, [clearHoverLeaveTimer]);

  /**
   * Rail only. When the drawer is open, `.railCollapsed` sets `pointer-events: none` on the
   * whole `<nav>` — the browser then emits `mouseleave` with `relatedTarget` often `null`.
   * That used to schedule `fullCollapsePanelAndRail` ~220ms after every icon click.
   */
  const onRailDockLeave = useCallback(
    (e?: MouseEvent) => {
      if (panelRef.current || panelExitAnimatingRef.current) return;
      if (e && stillWithinWorkspaceDock(e.relatedTarget)) return;
      scheduleHoverDockCollapse();
    },
    [scheduleHoverDockCollapse],
  );

  /** Drawer surface — this is the real pointer-leave signal when collapsing an open panel. */
  const onPanelDockLeave = useCallback(
    (e?: MouseEvent) => {
      if (panelExitAnimatingRef.current) return;
      if (e && stillWithinWorkspaceDock(e.relatedTarget)) return;
      scheduleHoverDockCollapse();
    },
    [scheduleHoverDockCollapse],
  );

  const hoverHandlers = useMemo<WorkspaceRailHoverHandlers>(
    () => ({
      onProfileDockEnter,
      onChromeDockEnter,
      onChromeDockLeave,
      onRailDockEnter,
      onRailDockLeave,
      onPanelDockLeave,
    }),
    [
      onProfileDockEnter,
      onChromeDockEnter,
      onChromeDockLeave,
      onRailDockEnter,
      onRailDockLeave,
      onPanelDockLeave,
    ],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TRIGGER BUTTON  (top-right header)
  //
  //  A  1 → 2   Reveal rail  (short 300ms trigger lock, icons are immediately clickable)
  //  E  2 → 1   Dismiss rail (full RAIL_ANIM_MS lock while stagger-exit plays)
  //  F  3 → 1   Close panel + hide rail — NO icon stagger visible (same as same-icon close):
  //               1. railInstantHide=true  → all icons go opacity:0 instantly, no transition
  //               2. panelOpen=false       → panel slides out (450ms)
  //               3. after 450ms           → reset everything; railInstantHide=false last
  //             triggerLocked for PANEL_MS only (450ms, not the full ~930ms rail anim)
  // ─────────────────────────────────────────────────────────────────────────
  const onTriggerClick = useCallback(() => {
    if (triggerLocked.current) return;

    if (!railRef.current) {
      // ── A: 1 → 2  Reveal ────────────────────────────────────────────
      // Short lock prevents accidental double-click but does NOT block icon clicks.
      // Icons are immediately interactive as soon as they're visible.
      triggerLocked.current = true;
      setRailDismissing(false);
      setRailVisible(true);
      scheduleTrigger(300, () => {
        triggerLocked.current = false;
      });
    } else if (!panelRef.current) {
      // ── E: 2 → 1  Dismiss ───────────────────────────────────────────
      triggerLocked.current = true;
      setRailDismissing(true);
      scheduleTrigger(RAIL_ANIM_MS, () => {
        setRailVisible(false);
        setRailDismissing(false);
        triggerLocked.current = false;
      });
    } else {
      // ── F: 3 → 1  Close panel + dock (same path as D: same-icon close)
      fullCollapsePanelAndRail();
    }
  }, [fullCollapsePanelAndRail, scheduleTrigger]);

  // ─────────────────────────────────────────────────────────────────────────
  // ICON CLICKS  (rail buttons)
  //
  // Icon clicks are NEVER blocked by triggerLocked.
  // This gives immediate visual response regardless of trigger animation state.
  //
  //  B  2 → 3   Open panel (immediate, no lock)
  //  D  3 → 1   Close panel + hide rail via same icon (like F; hover cannot keep dock open)
  //  C  3 → 3   Switch panel via different icon (crossfade, always immediate)
  // ─────────────────────────────────────────────────────────────────────────
  const onIconClick = useCallback(
    (id: PanelId, route?: string) => {
      // ← Never check triggerLocked here. Icon clicks always respond immediately.
      if (route) router.push(route);

      if (!panelRef.current) {
        // ── B: 2 → 3  Open panel ────────────────────────────────────────
        // No lock needed — even rapid icon clicks just update to the latest icon.
        clearHoverLeaveTimer();
        panelExitAnimatingRef.current = false;
        setPanelClosing(false);
        setActivePanel(id);
        setPanelOpen(true);
        setRailCollapsed(true);
      } else if (activeRef.current === id) {
        // ── D: 3 → 1  Full dock collapse (panelLocked avoids double-tap during animation)
        if (panelLocked.current) return;
        panelLocked.current = true;
        fullCollapsePanelAndRail();
      } else {
        // ── C: 3 → 3  Switch panel (crossfade) ──────────────────────────
        clearHoverLeaveTimer();
        setContentFading(true);
        setTimeout(() => {
          setActivePanel(id);
          setContentFading(false);
        }, 100);
      }
    },
    [clearHoverLeaveTimer, fullCollapsePanelAndRail, router],
  );

  // ── openPanel  (programmatic — used by route auto-reveal) ────────────────
  const openPanel = useCallback(
    (id: PanelId) => {
      clearHoverLeaveTimer();
      panelExitAnimatingRef.current = false;
      setPanelClosing(false);
      setActivePanel(id);
      setPanelOpen(true);
      setRailCollapsed(true);
    },
    [clearHoverLeaveTimer],
  );

  // ── Eva expand button  (same logic as F, then navigate) ──────────────────
  const expandEva = useCallback(() => {
    clearHoverLeaveTimer();
    if (triggerLocked.current) return;

    if (panelRef.current) {
      if (panelExitAnimatingRef.current) return;
      triggerLocked.current = true;
      panelExitAnimatingRef.current = true;
      armRailEnterSuppress();
      setRailInstantHide(true);
      setPanelClosing(true);
      setPanelOpen(false);
      scheduleTrigger(PANEL_MS, () => {
        panelExitAnimatingRef.current = false;
        setPanelClosing(false);
        setActivePanel(null);
        setRailCollapsed(false);
        setRailInstantHide(false);
        setRailVisible(false);
        triggerLocked.current = false;
        router.push(WORKFLOW_ROUTES.assistant);
      });
    } else {
      // Rail only visible (state 2 edge-case)
      triggerLocked.current = true;
      setRailDismissing(true);
      scheduleTrigger(RAIL_ANIM_MS, () => {
        setRailVisible(false);
        setRailDismissing(false);
        triggerLocked.current = false;
        router.push(WORKFLOW_ROUTES.assistant);
      });
    }
  }, [armRailEnterSuppress, clearHoverLeaveTimer, scheduleTrigger, router]);

  // ── Route auto-reveal ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!pathname || !AUTO_REVEAL_ROUTES.includes(pathname)) return;
    startTransition(() => {
      if (!railRef.current) {
        setRailDismissing(false);
        setRailVisible(true);
      }
      if (!panelRef.current) {
        openPanel("summary");
      }
    });
  }, [pathname, openPanel]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <WorkspaceRailHoverProvider value={hoverHandlers}>
      <SidebarContext.Provider
        value={{
          railVisible,
          railCollapsed,
          railInstantHide,
          panelOpen,
          panelClosing,
          activePanel,
          contentFading,
          railDismissing,
          onTriggerClick,
          onIconClick,
          openPanel,
          expandEva,
        }}
      >
        {children}
      </SidebarContext.Provider>
    </WorkspaceRailHoverProvider>
  );
}
