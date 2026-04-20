"use client";

import {
  createContext,
  useContext,
  type MouseEvent,
  type ReactNode,
} from "react";

export type WorkspaceRailHoverHandlers = {
  /** First hover on profile avatar — reveals the rail. */
  onProfileDockEnter: () => void;
  /** Pointer entered the fixed top chrome (utility bar + header). Cancels scheduled collapse. */
  onChromeDockEnter: () => void;
  /** Pointer left the fixed top chrome — may collapse after delay if not moving onto the rail/panel. */
  onChromeDockLeave: (e?: MouseEvent) => void;
  /** Pointer entered the workspace rail or panel. Cancels scheduled collapse. */
  onRailDockEnter: () => void;
  /**
   * Pointer left the rail `<nav>` only. When a panel is open the rail uses
   * `pointer-events: none`, which fires bogus `mouseleave` — this handler must
   * no-op while `panelOpen` (see `SidebarProvider`).
   */
  onRailDockLeave: (e?: MouseEvent) => void;
  /** Pointer left the sliding drawer surface — real “left workspace” signal for collapse. */
  onPanelDockLeave: (e?: MouseEvent) => void;
};

const noop = () => {};
const noopLeave = (): void => {};

const defaultHover: WorkspaceRailHoverHandlers = {
  onProfileDockEnter: noop,
  onChromeDockEnter: noop,
  onChromeDockLeave: noopLeave,
  onRailDockEnter: noop,
  onRailDockLeave: noopLeave,
  onPanelDockLeave: noopLeave,
};

const WorkspaceRailHoverContext =
  createContext<WorkspaceRailHoverHandlers>(defaultHover);

export function useWorkspaceRailHover(): WorkspaceRailHoverHandlers {
  return useContext(WorkspaceRailHoverContext);
}

export function WorkspaceRailHoverProvider({
  value,
  children,
}: {
  value: WorkspaceRailHoverHandlers;
  children: ReactNode;
}) {
  return (
    <WorkspaceRailHoverContext.Provider value={value}>
      {children}
    </WorkspaceRailHoverContext.Provider>
  );
}
