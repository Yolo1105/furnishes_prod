"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, selectCurrentProject } from "@studio/store";
import { useDraggable } from "@studio/hooks/useDraggable";
import { UserIcon, ArrowRightIcon, ChevronDownIcon } from "@studio/icons";
import { WORKFLOW_ROUTES } from "@/lib/site/workflow-routes";

/**
 * Top-LEFT project card — ported 1:1 from the JSX prototype's `<header
 * data-drag-id="navbar">` block. Same typography (Inter), same sizes,
 * same hover treatments, same inline rename + dropdown switcher.
 *
 * Brand row (single 12px line, gap 7px):
 *   • `Furnishes` + `STUDIO` — link to site home (`WORKFLOW_ROUTES.home`). Tagged
 *     `data-no-drag` so clicks navigate instead of starting a drag.
 *   • `/`           — muted separator
 *   • <project name>— editable button (Inter 12 600, muted ink); clicks
 *                     swap it for an `<input>` that auto-focuses + selects
 *                     all. Enter or Esc commits via blur; empty falls back
 *                     to "Untitled Space"
 *   • caret button  — 18×18 transparent square; rotates the chevron 180°
 *                     when the dropdown is open
 *
 * Workspace row (9.5px, marginTop 3px):
 *   • Small split-arm user icon (9×9 SVG) + `Personal · Interior Design`
 *
 * Dropdown (anchored left:0 to the project-name wrapper, NOT the whole
 * card — matches JSX exactly):
 *   • `SWITCH PROJECT` header (9.5px 700 uppercase)
 *   • One row per *other* project — name + relative-time stamp
 *   • Divider
 *   • `See all projects` accent row with a right-arrow
 *
 * Outside-click on a tightly-scoped `projectMenuRef` closes the dropdown
 * — clicks on the brand link, the `/` separator, or elsewhere outside
 * the project-name area close the menu, matching the JSX behavior.
 *
 * Drag-to-reposition is intentionally not implemented in this step. The
 * JSX wraps the card in `onMouseDown={startDrag("navbar")}` with a
 * shared drag state; that infrastructure will land in a future step
 * alongside the other floating cards (tools, reference, activity).
 */
export function TopProjectCard() {
  const projects = useStore((s) => s.projects);
  const currentProjectId = useStore((s) => s.currentProjectId);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const setProjectsModalOpen = useStore((s) => s.setProjectsModalOpen);
  const setCurrentProjectName = useStore((s) => s.setCurrentProjectName);
  const currentProject = useStore(selectCurrentProject);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(currentProject.name);

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  // Keep the draft in sync with the store when not actively editing.
  // (When the user switches projects via the dropdown, the input
  // shouldn't keep showing the old name if they later click to edit.)
  useEffect(() => {
    if (!editing) setDraftName(currentProject.name);
  }, [currentProject.name, editing]);

  // Auto-focus + select-all when entering edit mode — JSX behavior.
  useEffect(() => {
    if (editing && projectInputRef.current) {
      projectInputRef.current.focus();
      projectInputRef.current.select();
    }
  }, [editing]);

  // Outside-click closes the dropdown. Scoped to projectMenuRef so
  // clicks on the brand wordmark or "Studio" badge also close it
  // (they're outside the project-name area).
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const commitName = () => {
    setCurrentProjectName(draftName);
    setEditing(false);
  };

  const pickProject = (id: string) => {
    setCurrentProject(id);
    setMenuOpen(false);
    setEditing(false);
  };

  // Exclude whichever project the label actually represents. When
  // `currentProjectId` is still "" (bootstrap race) or stale, the
  // selector falls back to `projects[0]` — filtering only by
  // `currentProjectId` would wrongly list that project as switchable.
  const effectiveCurrentId = useMemo(() => {
    if (currentProjectId && projects.some((p) => p.id === currentProjectId)) {
      return currentProjectId;
    }
    return projects[0]?.id ?? "";
  }, [projects, currentProjectId]);

  const otherProjects = useMemo(
    () => projects.filter((p) => p.id !== effectiveCurrentId),
    [projects, effectiveCurrentId],
  );

  // Drag-to-reposition. The whole header is draggable; interactive
  // children (the rename button + caret + dropdown items) opt out
  // via `data-no-drag="true"` on their wrapper.
  const { onMouseDown, positionStyle } = useDraggable("project");

  // Brand tokens — kept inline rather than imported to keep the
  // component self-contained.
  const ink = "#1A1A1A";
  const accent = "#FF5A1F";
  const uiFont = "var(--font-app), system-ui, sans-serif";

  return (
    <header
      className="glass"
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        top: 14,
        left: 14,
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 14,
        padding: "8px 16px",
        gap: 10,
        zIndex: 5,
        whiteSpace: "nowrap",
        cursor: "grab",
        ...positionStyle,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* ─── Brand row ────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          <Link
            href={WORKFLOW_ROUTES.home}
            data-no-drag="true"
            aria-label="Furnishes home"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              borderRadius: 8,
              margin: "-2px -4px",
              padding: "2px 4px",
            }}
          >
            <span style={{ fontWeight: 500, color: ink }}>Furnishes</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: accent,
                padding: "2px 6px",
                borderRadius: 5,
                background: "rgba(255, 90, 31, 0.1)",
                border: "1px solid rgba(255, 90, 31, 0.25)",
              }}
            >
              Studio
            </span>
          </Link>

          <span style={{ color: "rgba(26,26,26,0.3)", fontWeight: 500 }}>
            /
          </span>

          {/* Project name + caret + dropdown — single relative wrapper
              so the dropdown anchors left:0 to this area.
              `data-no-drag` so clicking inside it doesn't start a
              drag — it lets the rename / dropdown-toggle clicks
              fire normally. */}
          <div
            ref={projectMenuRef}
            data-no-drag="true"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {editing ? (
              <input
                ref={projectInputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.currentTarget.blur();
                  }
                }}
                style={{
                  fontFamily: uiFont,
                  fontSize: 12,
                  fontWeight: 600,
                  color: ink,
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255, 90, 31, 0.4)",
                  borderRadius: 5,
                  padding: "1px 5px",
                  outline: "none",
                  minWidth: 120,
                  maxWidth: 200,
                }}
              />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                  setMenuOpen(false);
                }}
                className="project-name"
                title="Rename project"
                style={{
                  fontFamily: uiFont,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(26,26,26,0.75)",
                  background: "transparent",
                  border: "none",
                  padding: "1px 5px",
                  borderRadius: 5,
                  cursor: "text",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {currentProject.name}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
                setEditing(false);
              }}
              aria-label="Switch project"
              aria-expanded={menuOpen}
              className="project-caret"
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: "none",
                background: "transparent",
                color: "rgba(26,26,26,0.5)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <ChevronDownIcon size={11} rotated={menuOpen} />
            </button>

            {/* ─── Dropdown ───────────────────────────────────── */}
            {menuOpen && (
              <div
                className="glass-popover"
                style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  left: 0,
                  minWidth: 240,
                  borderRadius: 12,
                  padding: 8,
                  zIndex: 15,
                  animation: "bubble-in 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
                  fontFamily: uiFont,
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "rgba(26,26,26,0.45)",
                    padding: "4px 8px 6px 8px",
                  }}
                >
                  Switch project
                </div>

                {otherProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickProject(p.id)}
                    className="project-menu-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      width: "100%",
                      padding: "7px 8px",
                      border: "none",
                      background: "transparent",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: uiFont,
                      transition: "background 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: ink,
                      }}
                    >
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "rgba(26,26,26,0.5)",
                      }}
                    >
                      {p.updated}
                    </span>
                  </button>
                ))}

                <div
                  style={{
                    height: 1,
                    background: "rgba(124, 80, 50, 0.14)",
                    margin: "6px 4px",
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    setProjectsModalOpen(true);
                    setMenuOpen(false);
                  }}
                  className="project-menu-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    width: "100%",
                    padding: "7px 8px",
                    border: "none",
                    background: "transparent",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontFamily: uiFont,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: accent,
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span>See all projects</span>
                  <ArrowRightIcon size={11} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Workspace row ────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9.5,
            color: "rgba(26,26,26,0.55)",
            fontWeight: 500,
            marginTop: 3,
            whiteSpace: "nowrap",
          }}
        >
          <UserIcon size={9} />
          <span>Personal · Interior Design</span>
        </div>
      </div>
    </header>
  );
}
