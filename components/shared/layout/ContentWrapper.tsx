"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/shared/layout/sidebar/SidebarProvider";
import styles from "./ContentWrapper.module.css";

interface ContentWrapperProps {
  children: ReactNode;
  sidebar: ReactNode;
}

/**
 * Push layout: when the workspace drawer opens, the main column gains right margin
 * so content clears the fixed panel (same inset + width as `RightSidebar` `.panel`).
 */
export function ContentWrapper({ children, sidebar }: ContentWrapperProps) {
  const { panelOpen, panelClosing } = useSidebar();

  /** Open = reserve space; closing = animate margin with drawer (`--fur-panel-slide-*` in globals). */
  const mainInsetClass = panelOpen
    ? styles.mainPanelOpen
    : panelClosing
      ? styles.mainPanelClosing
      : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={cn(styles.main, mainInsetClass)}>{children}</div>
      {sidebar}
    </div>
  );
}
