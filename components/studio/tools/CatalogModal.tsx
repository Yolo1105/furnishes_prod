"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@studio/store";
import { useCatalog } from "@studio/catalog/useCatalog";
import type { CatalogItem } from "@studio/catalog/types";
import {
  LayoutGridIcon,
  SearchIcon,
  PlusCircleIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
} from "@studio/icons";

/**
 * Catalog — centered modal furniture picker. Modeled on the zip's V4
 * CatalogPanel (720×640, search + category pills + grid + bottom
 * Add button). Triggered from the Catalog tile in the Tools card.
 *
 * The Catalog tile is the *only* path to add furniture — there's no
 * separate "Add" button anywhere else. Inventory shows what's
 * placed; Catalog adds new things; the two have non-overlapping
 * jobs.
 *
 * Multi-select:
 *   • Clicking an item card toggles it in/out of the selection set
 *   • Cap is `MAX_BATCH` (10). Clicking an 11th when already at cap
 *     no-ops on selection and shows an at-cap flash explaining why
 *   • The footer button reads "Add N pieces" with the live count
 *   • A "N selected · Clear" pill sits in the header so the user
 *     can see + reset at a glance
 *   • Clicking Add appends the batch to the furniture-slice (so the
 *     Inventory tool reflects them immediately) and clears the
 *     selection. The modal stays open so the user can pick another
 *     batch without leaving. No success toast — the cleared count is
 *     the confirmation.
 *   • Esc / backdrop click closes the modal. There's no × button —
 *     the Catalog tile in the Tools card is the canonical toggle,
 *     same as every other tool. Esc / backdrop click are the
 *     in-modal alternatives.
 *
 * Each catalog entry flips its `placed` flag to true via
 * `placeItems`, which moves it from the Catalog grid to the
 * Inventory list. Since the universe of items is fixed (the GLB
 * meshes), there is no concept of "duplicating" — a piece is either
 * placed or not, and the same item cannot be added twice.
 */

const MODAL_WIDTH = 720;
const MODAL_HEIGHT = 640;
const MAX_BATCH = 10;

export function CatalogModal() {
  const openTools = useStore((s) => s.openTools);
  const closeTool = useStore((s) => s.closeTool);
  const isOpen = openTools.includes("catalog");
  const placeItems = useStore((s) => s.placeItems);
  // Read the furniture array (stable ref unless mutated) and derive
  // the placed-id set from it. This avoids the selector returning a
  // freshly-allocated Set on every store change, which would cause
  // every CatalogModal render to invalidate.
  const furniture = useStore((s) => s.furniture);
  const placedIds = useMemo(() => {
    const out = new Set<string>();
    for (const f of furniture) if (f.placed) out.add(f.id);
    return out;
  }, [furniture]);

  const { items, loading, error } = useCatalog();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  /** Modal mode — "browse" shows unplaced catalog items for adding;
   *  "manage" shows currently-placed items for hiding/removing/
   *  editing. Same grid structure, different source set + actions.
   *  Defaults to browse since "add new pieces" is the primary use
   *  case the modal is launched for. */
  const [mode, setMode] = useState<"browse" | "manage">("browse");
  /** Set of currently-selected catalog item ids. Stable order is
   *  preserved across re-renders by storing in an array; checks use
   *  `Array.includes`, which is fine at our cap of 10. */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** Single-purpose flash for the at-cap warning. Other moments
   *  (post-add, etc) intentionally don't fire any flash — the
   *  cleared selection count IS the confirmation. */
  const [capFlash, setCapFlash] = useState<string | null>(null);

  // Reset transient state every time the modal closes — fresh open
  // shouldn't pre-select previous items or carry over the search.
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setActiveCategory("all");
      setSelectedIds([]);
      setCapFlash(null);
      setMode("browse");
    }
  }, [isOpen]);

  // Clear selection when switching modes — Browse selections drive
  // an "add" action, Manage selections drive "hide/remove", so
  // carrying selection across modes would be unsafe.
  useEffect(() => {
    setSelectedIds([]);
    setSearch("");
    setActiveCategory("all");
  }, [mode]);

  // Lock body scroll while open so the page doesn't drift behind
  // the modal on touch devices.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    if (mode === "browse") {
      for (const it of items) set.add(it.category);
    } else {
      for (const f of furniture) if (f.placed) set.add(f.category);
    }
    return ["all", ...Array.from(set).sort()];
  }, [items, furniture, mode]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (mode === "browse") {
      // Browse: unplaced catalog items — items.length > furniture
      // because catalog can theoretically include items not seeded
      // from this GLB. Filter out anything currently placed since
      // those live in Inventory / Manage mode.
      return items.filter((it) => {
        if (placedIds.has(it.id)) return false;
        if (activeCategory !== "all" && it.category !== activeCategory)
          return false;
        if (q && !`${it.label} ${it.id}`.toLowerCase().includes(q))
          return false;
        return true;
      });
    }
    // Manage: currently-placed furniture, projected to the
    // CatalogItem shape so the grid render code below can stay
    // shared between modes. The grid only reads { id, label,
    // category, color, width, depth }, all of which exist on
    // PlacedItem with identical names/types.
    return furniture
      .filter((f) => f.placed)
      .filter((f) => {
        if (activeCategory !== "all" && f.category !== activeCategory)
          return false;
        if (q && !`${f.label} ${f.id}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .map(
        (f): CatalogItem => ({
          id: f.id,
          label: f.label,
          category: f.category,
          shape: f.shape,
          width: f.width,
          depth: f.depth,
          height: f.height,
          nodeNames: [],
        }),
      );
  }, [items, search, activeCategory, placedIds, mode, furniture]);

  const flashAtCap = () => {
    const msg = `Maximum ${MAX_BATCH} pieces per batch — deselect one first`;
    setCapFlash(msg);
    window.setTimeout(() => {
      setCapFlash((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  const toggleSelect = (it: CatalogItem) => {
    setSelectedIds((prev) => {
      if (prev.includes(it.id)) {
        return prev.filter((x) => x !== it.id);
      }
      // Cap only applies in Browse mode (we batch-add up to 10 at
      // once for performance + scope clarity). Manage mode has no
      // cap — bulk-hide of every placed item is a legitimate use.
      if (mode === "browse" && prev.length >= MAX_BATCH) {
        flashAtCap();
        return prev;
      }
      return [...prev, it.id];
    });
  };

  const handleAddBatch = () => {
    if (selectedIds.length === 0) return;
    // Defensive: only place items that are still un-placed. The
    // grid filters them out so this should be a no-op in practice.
    const ids = selectedIds.filter((id) => !placedIds.has(id));
    placeItems(ids);
    // Clear selection so the user can pick another batch. No flash —
    // the cleared count + the visible Inventory tile is enough
    // feedback. Adding a "successfully added" toast would just be
    // noise on top of clear UI state.
    setSelectedIds([]);
  };

  // Manage-mode actions. We need both the visibility toggle and
  // the remove action exposed at the slice level — both already
  // exist (toggleFurnitureVisibility, removeFurniture). Bulk
  // versions just iterate; the slice can absorb N rapid set()
  // calls fine at our item counts (~65 max).
  const toggleVisibility = useStore((s) => s.toggleFurnitureVisibility);
  const removeFurniture = useStore((s) => s.removeFurniture);

  const handleBulkHide = () => {
    if (selectedIds.length === 0) return;
    // Hide only items that are currently visible — running this on
    // an already-hidden item would unhide it (toggle semantics).
    const currentlyVisible = new Set(
      furniture.filter((f) => f.visible).map((f) => f.id),
    );
    for (const id of selectedIds) {
      if (currentlyVisible.has(id)) toggleVisibility(id);
    }
    setSelectedIds([]);
  };

  const handleBulkShow = () => {
    if (selectedIds.length === 0) return;
    const currentlyHidden = new Set(
      furniture.filter((f) => !f.visible).map((f) => f.id),
    );
    for (const id of selectedIds) {
      if (currentlyHidden.has(id)) toggleVisibility(id);
    }
    setSelectedIds([]);
  };

  const handleBulkRemove = () => {
    if (selectedIds.length === 0) return;
    // Capture before iterating since removeFurniture mutates the
    // furniture array, which our placedIds memo derives from.
    const ids = [...selectedIds];
    for (const id of ids) {
      removeFurniture(id);
    }
    setSelectedIds([]);
  };

  // Are all selected items currently visible / hidden? Drives the
  // single Hide/Show toggle button label in Manage mode.
  const allSelectedVisible = useMemo(() => {
    if (selectedIds.length === 0) return true;
    const byId = new Map<string, (typeof furniture)[number]>();
    for (const f of furniture) byId.set(f.id, f);
    return selectedIds.every((id) => byId.get(id)?.visible !== false);
  }, [selectedIds, furniture]);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => closeTool("catalog")}
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === "browse"
          ? "Catalog — add furniture"
          : "Catalog — manage placed furniture"
      }
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 18, 10, 0.32)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "var(--font-app), system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-modal"
        style={{
          width: MODAL_WIDTH,
          maxWidth: "calc(100vw - 32px)",
          height: MODAL_HEIGHT,
          maxHeight: "calc(100vh - 64px)",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ─── Title row ──────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 20px 12px 20px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              color: "#1A1A1A",
              flex: 1,
              minWidth: 0,
            }}
          >
            <LayoutGridIcon size={15} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Catalog
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(26, 26, 26, 0.5)",
                marginLeft: 4,
              }}
            >
              {mode === "browse"
                ? `${items.length - placedIds.size} available`
                : `${furniture.filter((f) => f.placed).length} placed`}
            </span>
          </div>

          {/* Browse / Manage tab switcher — sits in the middle of
              the title row. Browse adds new pieces to the room;
              Manage edits / hides / removes pieces already in it.
              The two modes share the grid + search + category UI;
              only the source set, the per-card click action, and
              the footer action differ. */}
          <div
            role="tablist"
            aria-label="Catalog mode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0,
              background: "rgba(26, 26, 26, 0.06)",
              padding: 3,
              borderRadius: 9,
              flexShrink: 0,
            }}
          >
            {(["browse", "manage"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                style={{
                  border: "none",
                  background:
                    mode === m ? "rgba(255, 90, 31, 0.95)" : "transparent",
                  color: mode === m ? "#fff" : "#1A1A1A",
                  fontFamily: "var(--font-app), system-ui, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "5px 12px",
                  borderRadius: 7,
                  cursor: "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                {m === "browse" ? "Browse" : "Manage"}
              </button>
            ))}
          </div>

          {/* Selected counter + Clear link — sits at the right end of
              the title row when anything is selected. */}
          {selectedIds.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(255, 90, 31, 0.1)",
                border: "1px solid rgba(255, 90, 31, 0.3)",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#FF5A1F",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {mode === "browse"
                  ? `${selectedIds.length} / ${MAX_BATCH} selected`
                  : `${selectedIds.length} selected`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 90, 31, 0.85)",
                  fontFamily: "var(--font-app), system-ui, sans-serif",
                  fontSize: 10.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* ─── Search row ─────────────────────────────────────────
            Borderless, full-width, with a bottom-divider that
            separates it from the category pills below. Matches
            the zip's V4 CatalogPanel pattern: the search is part
            of the modal's vertical structure, not a boxed input
            living inside the title row. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 20px 12px 20px",
            borderBottom: "1px solid rgba(124, 80, 50, 0.12)",
            flexShrink: 0,
          }}
        >
          <SearchIcon size={14} style={{ color: "rgba(26, 26, 26, 0.45)" }} />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--font-app), system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "#1A1A1A",
              padding: 0,
            }}
          />
        </div>

        {/* ─── Category pills ─────────────────────────────────── */}
        <div
          className="no-scrollbar"
          style={{
            display: "flex",
            gap: 5,
            padding: "12px 18px",
            overflowX: "auto",
            borderBottom: "1px solid rgba(124, 80, 50, 0.08)",
            flexShrink: 0,
          }}
        >
          {categories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: active
                    ? "rgba(255, 90, 31, 0.5)"
                    : "rgba(124, 80, 50, 0.18)",
                  background: active
                    ? "rgba(255, 90, 31, 0.1)"
                    : "rgba(255, 255, 255, 0.5)",
                  color: active ? "#FF5A1F" : "rgba(26, 26, 26, 0.7)",
                  fontFamily: "var(--font-app), system-ui, sans-serif",
                  fontSize: 11,
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  textTransform: "capitalize",
                  flexShrink: 0,
                  transition:
                    "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ─── Grid ───────────────────────────────────────────── */}
        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 18px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            alignContent: "flex-start",
          }}
        >
          {loading && (
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 12,
                color: "rgba(26, 26, 26, 0.5)",
                padding: 24,
                textAlign: "center",
              }}
            >
              Loading catalog…
            </div>
          )}
          {error && (
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 12,
                color: "rgba(180, 50, 30, 0.85)",
                padding: 24,
              }}
            >
              Failed to load catalog: {error}
            </div>
          )}
          {!loading && !error && filteredItems.length === 0 && (
            <div
              style={{
                gridColumn: "1 / -1",
                fontSize: 12,
                color: "rgba(26, 26, 26, 0.5)",
                padding: 24,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {placedIds.size === items.length && items.length > 0 ? (
                <>
                  Every piece in the catalog is already placed.
                  <br />
                  <span style={{ color: "rgba(26, 26, 26, 0.4)" }}>
                    Remove items from Inventory to add them again.
                  </span>
                </>
              ) : (
                "No items match your search."
              )}
            </div>
          )}
          {!loading &&
            !error &&
            filteredItems.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                selected={selectedIds.includes(it.id)}
                onClick={() => toggleSelect(it)}
              />
            ))}
        </div>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid rgba(124, 80, 50, 0.12)",
            background: "rgba(255, 255, 255, 0.35)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: capFlash ? 8 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              minHeight: 32,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color:
                  selectedIds.length > 0
                    ? "rgba(26, 26, 26, 0.7)"
                    : "rgba(26, 26, 26, 0.5)",
              }}
            >
              {mode === "browse"
                ? selectedIds.length === 0
                  ? `Select pieces to add to your scene. Up to ${MAX_BATCH} per batch.`
                  : `Click "Add" to place ${selectedIds.length} piece${
                      selectedIds.length === 1 ? "" : "s"
                    } in the scene.`
                : selectedIds.length === 0
                  ? "Select placed pieces to hide, show, or remove from your scene."
                  : `${selectedIds.length} piece${
                      selectedIds.length === 1 ? "" : "s"
                    } selected — choose an action.`}
            </span>

            {mode === "browse" ? (
              <button
                type="button"
                onClick={handleAddBatch}
                disabled={selectedIds.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    selectedIds.length > 0
                      ? "#FF5A1F"
                      : "rgba(26, 26, 26, 0.08)",
                  color:
                    selectedIds.length > 0
                      ? "#FFF4EC"
                      : "rgba(26, 26, 26, 0.4)",
                  fontFamily: "var(--font-app), system-ui, sans-serif",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                  flexShrink: 0,
                  transition: "background 0.15s ease, transform 0.12s ease",
                  boxShadow:
                    selectedIds.length > 0
                      ? "0 4px 12px -3px rgba(255, 90, 31, 0.4)"
                      : "none",
                }}
              >
                <PlusCircleIcon size={13} />
                {selectedIds.length === 0
                  ? "Add to scene"
                  : `Add ${selectedIds.length} piece${selectedIds.length === 1 ? "" : "s"}`}
              </button>
            ) : (
              // Manage mode: Hide/Show toggle + Remove. Hide vs Show
              // is decided by allSelectedVisible — if every selected
              // item is visible we offer Hide; otherwise we offer
              // Show (so a mixed selection unhides everything in
              // one click rather than toggling).
              <div style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={allSelectedVisible ? handleBulkHide : handleBulkShow}
                  disabled={selectedIds.length === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      selectedIds.length > 0
                        ? "rgba(26, 26, 26, 0.08)"
                        : "rgba(26, 26, 26, 0.04)",
                    color:
                      selectedIds.length > 0
                        ? "#1A1A1A"
                        : "rgba(26, 26, 26, 0.4)",
                    fontFamily: "var(--font-app), system-ui, sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                    transition: "background 0.15s ease",
                  }}
                >
                  {allSelectedVisible ? (
                    <EyeOffIcon size={12} />
                  ) : (
                    <EyeIcon size={12} />
                  )}
                  {allSelectedVisible ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={handleBulkRemove}
                  disabled={selectedIds.length === 0}
                  title="Remove selected pieces from your scene"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      selectedIds.length > 0
                        ? "rgba(255, 90, 31, 0.95)"
                        : "rgba(26, 26, 26, 0.08)",
                    color:
                      selectedIds.length > 0
                        ? "#FFF4EC"
                        : "rgba(26, 26, 26, 0.4)",
                    fontFamily: "var(--font-app), system-ui, sans-serif",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
                    transition: "background 0.15s ease",
                    boxShadow:
                      selectedIds.length > 0
                        ? "0 4px 12px -3px rgba(255, 90, 31, 0.4)"
                        : "none",
                  }}
                >
                  <TrashIcon size={12} />
                  Remove{selectedIds.length > 0 ? ` ${selectedIds.length}` : ""}
                </button>
              </div>
            )}
          </div>

          {capFlash && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 7,
                background: "rgba(255, 90, 31, 0.08)",
                border: "1px solid rgba(255, 90, 31, 0.22)",
                color: "rgba(26, 26, 26, 0.78)",
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {capFlash}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Item card ─────────────────────────────────────────────────────

interface ItemCardProps {
  item: CatalogItem;
  selected: boolean;
  onClick: () => void;
}

function ItemCard({ item, selected, onClick }: ItemCardProps) {
  // Shape hint: rectangle sized to the item's width/depth ratio,
  // capped so a 0.05-thick item doesn't render as a hairline.
  const ratio = Math.max(
    0.25,
    Math.min(item.width / Math.max(0.1, item.depth), 4),
  );
  const shapeWidth = Math.min(56, 26 * ratio);
  const shapeHeight = 26;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "12px 12px 11px 12px",
        borderRadius: 10,
        border: "1.5px solid",
        borderColor: selected
          ? "rgba(255, 90, 31, 0.55)"
          : "rgba(124, 80, 50, 0.16)",
        background: selected
          ? "rgba(255, 90, 31, 0.08)"
          : "rgba(255, 255, 255, 0.55)",
        cursor: "pointer",
        fontFamily: "var(--font-app), system-ui, sans-serif",
        textAlign: "left",
        gap: 8,
        transition:
          "background 0.15s ease, border-color 0.15s ease, transform 0.1s ease",
      }}
    >
      {/* Selected indicator — top-right filled dot */}
      {selected && (
        <span
          aria-label="Selected"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#FF5A1F",
            boxShadow: "0 0 0 2px #FFF4EC",
          }}
        />
      )}

      {/* Shape hint area */}
      <div
        style={{
          width: "100%",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.55)",
          borderRadius: 7,
          border: "1px dashed rgba(124, 80, 50, 0.15)",
        }}
      >
        <div
          style={{
            width: shapeWidth,
            height: shapeHeight,
            borderRadius: 4,
            background: selected
              ? "rgba(255, 90, 31, 0.6)"
              : "rgba(26, 26, 26, 0.28)",
            transition: "background 0.15s ease",
          }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#1A1A1A",
          lineHeight: 1.25,
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </span>

      {/* Dimensions */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: "rgba(26, 26, 26, 0.5)",
          letterSpacing: "0.01em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {item.width.toFixed(2)} × {item.depth.toFixed(2)} ×{" "}
        {item.height.toFixed(2)} m
      </span>
    </button>
  );
}
