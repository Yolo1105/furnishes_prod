"use client";

import dynamic from "next/dynamic";
import { useStore } from "@studio/store";
import { useDraggable } from "@studio/hooks/useDraggable";
import { ImageIcon, PinIcon } from "@studio/icons";
import { FloorPlan2D } from "@studio/views/FloorPlan2D";

/**
 * Reference floating card — top-right by default (aligned with the
 * Project card's top edge at the opposite corner), draggable,
 * resizable.
 *
 * The card always shows the *opposite* of the main viewport:
 *   • main = 3D  →  reference shows 2D floor plan
 *   • main = 2D  →  reference shows a compact 3D scene
 *
 * Clicking the swap button (arrows-exchange icon) flips the main
 * view's mode, which automatically swaps what the card displays.
 * This is the JSX prototype's paired-views model: only one R3F
 * canvas is ever live at a time, so there's no double-loading
 * the GLB or two sets of OrbitControls fighting each other.
 *
 * The card is draggable via `useDraggable("tool-reference")`. The
 * resize handle in the bottom-right corner is tagged
 * `data-drag-handle="true"` so its mousedown wins over the card's
 * drag handler — letting it run its own resize gesture.
 *
 * Closing is via the × button in the header (or by clicking the
 * Reference tile in the Tools card again).
 */

// Mount the compact 3D scene only when needed. Dynamic import +
// ssr:false keeps the R3F bundle from running server-side.
const MiniScene3D = dynamic(
  () =>
    import("@studio/views/MiniScene3D").then((m) => ({
      default: m.MiniScene3D,
    })),
  { ssr: false },
);

export function ReferenceCard() {
  const mainViewMode = useStore((s) => s.mainViewMode);
  const swapMainViewMode = useStore((s) => s.swapMainViewMode);
  const referenceSize = useStore((s) => s.referenceSize);
  const setReferenceSize = useStore((s) => s.setReferenceSize);

  // v0.40.30: ad-hoc preview override takes priority over both the
  // selected piece's imageUrl AND the standard 2D/3D toggle. Used
  // by Interior Design tile expansion: clicking a sub-piece in the
  // expanded room tile sets this so the user sees that piece's 2D
  // image without first applying the room.
  const referencePreviewImageUrl = useStore(
    (s) => s.referencePreviewImageUrl ?? null,
  );
  const setReferencePreviewImageUrl = useStore(
    (s) => s.setReferencePreviewImageUrl,
  );

  // v0.40.28: per-piece reference image. When a generated piece is
  // selected AND it carries `meta.imageUrl` (the 2D Flux image that
  // became the input to TripoSR/Hunyuan3D), show THAT image in the
  // reference card. The user's mental model: "every combination
  // (3D mesh + 2D image) is its own grouping." The reference card
  // is where the 2D half of that grouping lives. Falls back to the
  // standard floor-plan / 3D toggle when no piece is selected or
  // the selected piece has no imageUrl (older entries, or pieces
  // not from the chat-generation pipeline).
  const pieceImageUrl = useStore((s) => {
    if (!s.selectedId) return null;
    const item = (s.furniture ?? []).find((f) => f.id === s.selectedId);
    if (!item) return null;
    const meta = item.meta as { imageUrl?: string } | undefined;
    return meta?.imageUrl ?? null;
  });

  const { onMouseDown, positionStyle } = useDraggable("tool-reference");

  // The card shows: ad-hoc preview override > per-piece selection
  // image > the opposite of the main view (2D ↔ 3D toggle).
  // v0.40.30: introduced the override as the highest priority.
  const effectiveImageUrl = referencePreviewImageUrl ?? pieceImageUrl;
  const showing: "2d" | "3d" | "piece-image" = effectiveImageUrl
    ? "piece-image"
    : mainViewMode === "3d"
      ? "2d"
      : "3d";

  // Waypoint mode is gated on 2D being visible somewhere — it
  // doesn't matter whether the 2D plan is in the Reference card or
  // promoted to the main viewport (after a swap). Either way the
  // user clicks the same FloorPlan2D component to add a waypoint.
  // We don't gate on `showing === "2d"` alone, otherwise enabling
  // waypoint mode in the card and then swapping would silently
  // turn it off.
  const waypointMode = useStore((s) => s.waypointMode);
  const setWaypointMode = useStore((s) => s.setWaypointMode);
  const customWaypoints = useStore((s) => s.customWaypoints);
  const clearWaypoints = useStore((s) => s.clearWaypoints);

  // v0.40.29: disable swap + waypoint buttons while a generation is
  // in flight. The user reported clicking swap during a thinking
  // phase produced inconsistent state because the underlying scene
  // is mid-mutation. Easier and clearer to lock interactions until
  // the result lands. Same disable applies during isThinking (chat
  // mode) — pure correctness, since the user shouldn't be poking
  // at view state while we're computing a response.
  const isThinking = useStore((s) => s.isThinking);
  const isGenerating = useStore((s) => s.isGenerating);
  const isProcessing = isThinking || isGenerating;

  // v0.40.29: when swap is clicked while a piece is selected (and
  // therefore Reference is showing the piece-image), DESELECT the
  // piece instead of flipping the main view's mode. This matches
  // the user's mental model: "the reference card should toggle
  // back to the default 2D/3D view." Deselection clears the
  // piece-image override; the existing mainViewMode toggle then
  // takes over again. After deselection, a SECOND swap click works
  // normally (flips 2D/3D for the main view).
  const selectFurniture = useStore((s) => s.selectFurniture);
  const handleSwapClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return; // safety: also enforced via disabled
    if (showing === "piece-image") {
      // Exit piece-image mode. Clear BOTH the ad-hoc preview override
      // (set by tile expansion) AND the selection-driven piece image
      // (set by piece selection). Whichever was active, the user
      // wants to return to the default 2D/3D toggle.
      setReferencePreviewImageUrl(null);
      selectFurniture(null);
      return;
    }
    swapMainViewMode();
  };

  return (
    <aside
      data-card-id="tool-reference"
      className="glass"
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        // Aligned with the Project card's top edge so the two cards
        // sit on the same top baseline at opposite corners — Project
        // top-left, Reference top-right. Both at top: 14.
        top: 14,
        right: 14,
        width: referenceSize.width,
        height: referenceSize.height,
        borderRadius: 14,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 4,
        cursor: "grab",
        overflow: "visible",
        ...positionStyle,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#1A1A1A",
            fontFamily: "var(--font-app), system-ui, sans-serif",
          }}
        >
          <ImageIcon size={13} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {"Reference"}
          </span>
        </div>

        <div
          style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
          data-no-drag="true"
        >
          {/* Waypoint mode toggle. Lit when active. Clicking adds
              waypoints to the 2D plan; clicking again exits.
              Long-press / shift-click clears all (cheap admin).
              v0.40.29: disabled while a generation is in flight. */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              if (isProcessing) return;
              if (e.shiftKey && customWaypoints.length > 0) {
                clearWaypoints();
                return;
              }
              setWaypointMode(!waypointMode);
            }}
            aria-label={
              waypointMode
                ? "Exit waypoint mode"
                : "Enter waypoint mode (click 2D plan to drop pins)"
            }
            title={
              isProcessing
                ? "Disabled while generating"
                : waypointMode
                  ? `Waypoint mode ON — click on 2D plan to add (${customWaypoints.length} placed; shift-click here to clear)`
                  : `Waypoint mode — click 2D plan to drop pins (${customWaypoints.length} placed)`
            }
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "none",
              background: waypointMode
                ? "rgba(231, 85, 26, 0.16)"
                : "transparent",
              color: isProcessing
                ? "rgba(26, 26, 26, 0.25)"
                : waypointMode
                  ? "#e7551a"
                  : "rgba(26, 26, 26, 0.6)",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              transition: "background 0.15s ease, opacity 0.15s ease",
            }}
          >
            <PinIcon size={13} />
          </button>

          {/* Swap button.
              v0.40.29:
                - Disabled while a generation is in flight.
                - When a piece is selected (showing === "piece-image"),
                  swap acts as "exit piece view" (deselects the
                  piece) instead of toggling main 2D/3D mode. */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSwapClick}
            aria-label={
              isProcessing
                ? "Disabled while generating"
                : showing === "piece-image"
                  ? "Exit piece reference view"
                  : "Swap with main view"
            }
            title={
              isProcessing
                ? "Disabled while generating"
                : showing === "piece-image"
                  ? "Exit piece reference (deselects piece)"
                  : "Swap with main view"
            }
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: isProcessing
                ? "rgba(26, 26, 26, 0.25)"
                : "rgba(26, 26, 26, 0.6)",
              cursor: isProcessing ? "not-allowed" : "pointer",
              opacity: isProcessing ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              transition: "opacity 0.15s ease",
            }}
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body — shows the swap content. data-no-drag prevents drags
          inside the 3D / 2D area from grabbing the card; rotating
          the mini scene with mouse drag is what users want here. */}
      <div
        data-no-drag="true"
        style={{
          flex: 1,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {showing === "piece-image" && effectiveImageUrl ? (
          // v0.40.28: per-piece 2D reference. Object-fit contain so
          // the image isn't cropped — the user wants to SEE the
          // image that became the 3D mesh, end-to-end.
          // v0.40.30: source is whichever of the two image inputs
          // is active (preview override > selected-piece image).
          <img
            src={effectiveImageUrl}
            alt="2D reference image"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 6,
              userSelect: "none",
            }}
          />
        ) : showing === "3d" ? (
          <MiniScene3D />
        ) : (
          <FloorPlan2D compact />
        )}
      </div>

      {/* Resize handle — tagged drag-handle so it wins over the
          card's drag, runs its own gesture. */}
      <div
        data-drag-handle="true"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startW = referenceSize.width;
          const startH = referenceSize.height;
          const onMove = (ev: MouseEvent) => {
            const newW = Math.max(
              160,
              Math.min(window.innerWidth - 40, startW + (ev.clientX - startX)),
            );
            const newH = Math.max(
              140,
              Math.min(window.innerHeight - 40, startH + (ev.clientY - startY)),
            );
            setReferenceSize({ width: newW, height: newH });
          };
          const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
          };
          document.body.style.userSelect = "none";
          document.body.style.cursor = "nwse-resize";
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 18,
          height: 18,
          cursor: "nwse-resize",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: 3,
          color: "rgba(26, 26, 26, 0.35)",
        }}
      >
        <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
          <path d="M9 1 L9 9 L1 9" stroke="currentColor" strokeWidth={1} />
        </svg>
      </div>
    </aside>
  );
}
