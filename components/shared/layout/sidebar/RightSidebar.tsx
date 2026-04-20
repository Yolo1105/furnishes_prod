"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FileText,
  Search,
  MessageCircle,
  Palette,
  Wallet,
  CheckCircle2,
  BarChart2,
  ShoppingBag,
  UserCircle,
} from "lucide-react";
import { useFirstSectionNavTheme } from "@/hooks/site/useFirstSectionNavTheme";
import { LANDING_SECTION_IDS } from "@/content/site/landing-sections";
import type { PanelId, RailButton } from "./types";
import { useSidebar } from "./SidebarProvider";
import { useWorkspaceRailHover } from "./workspace-rail-hover";
import { WorkspacePanelBody } from "@/components/site/workspace-panel-body";
import styles from "./RightSidebar.module.css";

// ── Rail config ───────────────────────────────────────────────────────────────

const GROUPS = [
  {
    bottom: false,
    buttons: [{ id: "summary" as PanelId, label: "Summary", Icon: FileText }],
  },
  {
    bottom: false,
    buttons: [
      { id: "search" as PanelId, label: "Search", Icon: Search },
      { id: "chatbot" as PanelId, label: "Eva AI", Icon: MessageCircle },
    ],
  },
  {
    bottom: false,
    buttons: [
      {
        id: "style" as PanelId,
        label: "Style",
        Icon: Palette,
        route: "/style",
        evaHeader: true,
      },
      {
        id: "budget" as PanelId,
        label: "Budget",
        Icon: Wallet,
        route: "/budget",
        evaHeader: true,
      },
      {
        id: "validate" as PanelId,
        label: "Check",
        Icon: CheckCircle2,
        evaHeader: true,
      },
      {
        id: "report" as PanelId,
        label: "Report",
        Icon: BarChart2,
        evaHeader: true,
      },
    ],
  },
  {
    bottom: true,
    buttons: [
      { id: "cart" as PanelId, label: "Cart", Icon: ShoppingBag },
      { id: "profile" as PanelId, label: "Profile", Icon: UserCircle },
    ],
  },
];

const ALL_BUTTONS = GROUPS.flatMap((g) => g.buttons);
const RAIL_TOP_GROUPS = GROUPS.filter((g) => !g.bottom);
const RAIL_BOTTOM_GROUPS = GROUPS.filter((g) => g.bottom);

// ── Component ─────────────────────────────────────────────────────────────────

export function RightSidebar() {
  const {
    railVisible,
    railCollapsed,
    railInstantHide,
    railDismissing,
    panelOpen,
    panelClosing,
    activePanel,
    onIconClick,
  } = useSidebar();
  const hover = useWorkspaceRailHover();

  const pathname = usePathname();
  const [navMounted, setNavMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setNavMounted(true));
  }, []);

  const path = pathname ?? "";
  const isHome = path === "/";
  const sectionTone = useFirstSectionNavTheme(
    isHome ? LANDING_SECTION_IDS[0] : undefined,
  );
  const baseTheme: "light" | "dark" = isHome ? "light" : "dark";
  const effectiveTheme: "light" | "dark" = !navMounted
    ? baseTheme
    : (sectionTone ?? baseTheme);

  const panelSurfaceVisible = panelOpen || panelClosing;
  const panelOneSheet = panelSurfaceVisible && activePanel != null;

  return (
    <aside
      className={styles.sidebar}
      data-workspace-dock
      aria-label="Workspace sidebar"
    >
      <div
        className={[
          styles.panel,
          panelOpen ? styles.panelOpen : "",
          panelSurfaceVisible ? styles.panelSurfaceExit : "",
          panelOneSheet ? styles.panelOneSheet : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden={!panelOpen && !panelClosing}
        id="right-sidebar"
      >
        {/*
          Hover handlers live on .panelTab, not the outer .panel: with .panelOneSheet the panel
          shell uses pointer-events:none so clicks pass through the padded header row — the shell
          itself does not reliably receive mouseenter/mouseleave in all browsers.
        */}
        <div
          className={`${styles.panelTab} ${styles.panelBody}`}
          onMouseEnter={hover.onRailDockEnter}
          onMouseLeave={(e) => hover.onPanelDockLeave(e)}
        >
          <WorkspacePanelBody />
        </div>
      </div>

      <nav
        className={[
          styles.rail,
          !railVisible ? styles.railHidden : "",
          effectiveTheme === "light" ? styles.railHeroLight : "",
          railCollapsed ? styles.railCollapsed : "",
          railInstantHide ? styles.railInstantHide : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Sidebar navigation"
        inert={!railVisible ? true : undefined}
        onMouseEnter={hover.onRailDockEnter}
        onMouseLeave={(e) => hover.onRailDockLeave(e)}
      >
        <div className={styles.railUpper}>
          {RAIL_TOP_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className={styles.railGroup}>
              {group.buttons.map((btn: RailButton) => {
                const idx = ALL_BUTTONS.findIndex((b) => b.id === btn.id);
                const isActive = activePanel === btn.id;

                return (
                  <button
                    key={btn.id}
                    type="button"
                    className={[
                      styles.railButton,
                      railVisible && !railDismissing && !railCollapsed
                        ? styles.railButtonRevealed
                        : "",
                      isActive ? styles.railButtonActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      {
                        "--stagger-delay": `${idx * 60}ms`,
                      } as React.CSSProperties
                    }
                    onClick={() => onIconClick(btn.id, btn.route)}
                    aria-pressed={isActive}
                    aria-label={btn.label}
                    tabIndex={
                      railVisible && !railDismissing && !railCollapsed ? 0 : -1
                    }
                  >
                    <span className={styles.railButtonCell}>
                      <btn.Icon
                        size={20}
                        strokeWidth={1.6}
                        className={styles.railIcon}
                        aria-hidden="true"
                      />
                      <span className={styles.railLabel}>{btn.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {RAIL_BOTTOM_GROUPS.map((group, gIdx) => (
          <div
            key={`bottom-${gIdx}`}
            className={`${styles.railGroup} ${styles.railGroupBottom}`}
          >
            {group.buttons.map((btn: RailButton) => {
              const idx = ALL_BUTTONS.findIndex((b) => b.id === btn.id);
              const isActive = activePanel === btn.id;

              return (
                <button
                  key={btn.id}
                  type="button"
                  className={[
                    styles.railButton,
                    railVisible && !railDismissing && !railCollapsed
                      ? styles.railButtonRevealed
                      : "",
                    isActive ? styles.railButtonActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      "--stagger-delay": `${idx * 60}ms`,
                    } as React.CSSProperties
                  }
                  onClick={() => onIconClick(btn.id, btn.route)}
                  aria-pressed={isActive}
                  aria-label={btn.label}
                  tabIndex={
                    railVisible && !railDismissing && !railCollapsed ? 0 : -1
                  }
                >
                  <span className={styles.railButtonCell}>
                    <btn.Icon
                      size={20}
                      strokeWidth={1.6}
                      className={styles.railIcon}
                      aria-hidden="true"
                    />
                    <span className={styles.railLabel}>{btn.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
