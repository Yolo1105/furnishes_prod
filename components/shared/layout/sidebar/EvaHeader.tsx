"use client";

import { Maximize2 } from "lucide-react";
import type { PanelId } from "./types";
import { useSidebar } from "./SidebarProvider";
import styles from "./EvaHeader.module.css";

const PANEL_LABELS: Record<string, string> = {
  summary: "Summary",
  search: "Search",
  chatbot: "Chat",
  style: "Style Guide",
  budget: "Budget Planner",
  "room-planner": "Room preview",
  validate: "Design Review",
  report: "Project Report",
  cart: "Cart",
  profile: "Profile",
};

interface EvaHeaderProps {
  panelId: PanelId;
}

export function EvaHeader({ panelId }: EvaHeaderProps) {
  const { expandEva } = useSidebar();

  return (
    <header className={styles.header}>
      {/* Eva avatar */}
      <div className={styles.avatar} aria-hidden="true">
        E
      </div>

      <div className={styles.meta}>
        <span className={styles.name}>Eva</span>
        <span className={styles.role}>
          AI Assistant · {PANEL_LABELS[panelId] ?? panelId}
        </span>
      </div>

      {/* Expand to fullscreen — closes sidebar, navigates to /chatbot */}
      <button
        className={styles.expandBtn}
        onClick={expandEva}
        aria-label="Expand Eva to full screen"
        title="Open full chat"
      >
        <Maximize2 size={14} strokeWidth={1.8} />
      </button>
    </header>
  );
}
