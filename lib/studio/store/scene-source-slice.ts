import type { StateCreator } from "zustand";
import type { PlacedItem } from "./furniture-slice";
import type { Wall, Opening } from "@studio/floorplan/types";
import type { RoomMeta } from "@studio/director/adapter";
import type { StyleBible } from "@studio/director/schema";

/**
 * Scene-source slice — owns the room-director-specific state plus
 * cross-slice bulk-write actions that the generation pipeline needs.
 *
 * Why a separate slice:
 *   - `sceneSource` drives Apartment / GeneratedApartment / Scene's
 *     branching (Turn 4): viewer source loads /apartamento.glb;
 *     room-director source mounts a synthetic apartment from
 *     roomMeta + walls.
 *   - `originalScene` is the snapshot Reset-to-original (Turn 5)
 *     restores. Frozen at the moment a generation completes.
 *   - `currentStyleBible` is consumed by follow-up generations so a
 *     sofa added after a room is generated inherits the room's style.
 *   - `isGenerating` / `generationStage` drive the chat dock's
 *     stop-button affordance + ambient progress text.
 *
 * Bulk-write strategy:
 *   `applyScene` and `resetToOriginalScene` write to multiple slices
 *   atomically by calling `set` on the merged store directly. This
 *   avoids inventing parallel "setFurniture" / "setWalls" actions on
 *   the existing slices that nothing else would use, and keeps the
 *   single-snapshot semantics that Apartment subscribers expect (one
 *   set call → one re-render → one wrapping-group reflow).
 */

export interface SceneSourceState {
  /** Where the current scene came from. "viewer" loads
   *  /apartamento.glb (existing default behaviour). "room-director"
   *  mounts <GeneratedApartment> sized to roomMeta and renders pieces
   *  from their meta.glbUrl URLs. */
  sceneSource: "viewer" | "room-director";

  /** Room dimensions + bounds in world-space y-UP coordinates. Set by
   *  `applyScene` when a layout event arrives; null when sceneSource
   *  is "viewer" (the apartment GLB defines its own bounds). */
  roomMeta: RoomMeta | null;

  /** The active style bible from the most recent generation. Used by
   *  follow-up single-piece generations (style coherence) and by Turn 6
   *  style-transfer (palette derivation). null when no generation has
   *  happened yet. */
  currentStyleBible: StyleBible | null;

  /** Frozen snapshot of the scene at generation completion. The Reset-
   *  to-original button restores from this. null until the first
   *  generation completes. */
  originalScene: {
    sceneSource: "viewer" | "room-director";
    furniture: PlacedItem[];
    roomMeta: RoomMeta | null;
    walls: Wall[];
    openings: Opening[];
    styleBible: StyleBible | null;
  } | null;

  /** True while the orchestrator stream is active. Drives the chat
   *  dock's stop button and gates concurrent submits. */
  isGenerating: boolean;

  /** Current pipeline stage as a short user-facing string (e.g.
   *  "Asking Claude to plan…", "Generating piece 2 of 6"). Empty
   *  when not generating. */
  generationStage: string;

  /** Optional reference image URL from the style anchor pass. Surfaced
   *  in the chat dock as a small thumbnail next to the room when a
   *  generation just completed. */
  referenceImageUrl: string | null;

  /** v0.40.30: ad-hoc Reference-card image override. When set, the
   *  Reference card displays THIS image regardless of selection
   *  state. Used by the Interior Design tile expansion: clicking a
   *  sub-piece thumbnail in an expanded room tile sets this so the
   *  user can preview the 2D image WITHOUT having to apply the
   *  whole room and select the matching placed item first. Null
   *  means "no override active" — the Reference card falls back to
   *  the standard pieceImageUrl-or-2D/3D-toggle logic. Cleared on
   *  scene swap and on explicit deselect via the Reference card's
   *  swap button. */
  referencePreviewImageUrl: string | null;

  /** True for ~500ms after applyScene swaps in a multi-piece scene.
   *  Studio renders a brief crossfade overlay over the canvas during
   *  this window so the swap feels intentional rather than jarring.
   *  Hard cuts are kept for single-piece swaps (where the user wants
   *  to see the change immediately, and a fade adds delay without
   *  helping orient them). v0.40.18.
   */
  sceneTransitionActive: boolean;
}

export interface SceneSourceActions {
  setSceneSource: (s: "viewer" | "room-director") => void;
  setRoomMeta: (m: RoomMeta | null) => void;
  setIsGenerating: (b: boolean) => void;
  setGenerationStage: (s: string) => void;
  setReferenceImageUrl: (u: string | null) => void;
  /** v0.40.30: set/clear the Reference-card preview override. */
  setReferencePreviewImageUrl: (u: string | null) => void;

  /** Bulk-apply a generated scene. Sets sceneSource = "room-director"
   *  and replaces furniture, roomMeta, walls, openings, styleBible.
   *  Single set() call so the apartment subscriber sees one
   *  consistent snapshot. */
  applyScene: (input: {
    furniture: PlacedItem[];
    roomMeta: RoomMeta;
    walls?: Wall[];
    openings?: Opening[];
    styleBible?: StyleBible;
    referenceImageUrl?: string;
  }) => void;

  /** Patch a single piece's meta. Called by useDesignStream on each
   *  `piece_ready` event to attach the GLB url. The scene's piece is
   *  already in the furniture array (placed by the prior `layout`
   *  event); we just need to update its meta.glbUrl. */
  patchItemMeta: (id: string, meta: Record<string, unknown>) => void;

  /** Freeze the current state as the originalScene baseline. */
  freezeOriginalScene: () => void;

  /** Restore the frozen originalScene snapshot. No-op if null. */
  resetToOriginalScene: () => void;
}

export type SceneSourceSlice = SceneSourceState & SceneSourceActions;

/** Build the scene-source slice. Slice writes to its own state plus
 *  the furniture / walls slices via direct set() calls — this works
 *  because all slices share one root store (use-store composition). */
export const createSceneSourceSlice: StateCreator<
  // Use `unknown` for the cross-slice fields the actions touch — the
  // root store satisfies them all. We type the local actions strictly
  // and lean on Zustand's merged-state model for the rest.
  SceneSourceSlice
> = (set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  sceneSource: "viewer",
  roomMeta: null,
  currentStyleBible: null,
  originalScene: null,
  isGenerating: false,
  generationStage: "",
  referenceImageUrl: null,
  referencePreviewImageUrl: null,
  sceneTransitionActive: false,

  // ── Setters ────────────────────────────────────────────────────
  setSceneSource: (s) => set({ sceneSource: s }),
  setRoomMeta: (m) => set({ roomMeta: m }),
  setIsGenerating: (b) => set({ isGenerating: b }),
  setGenerationStage: (s) => set({ generationStage: s }),
  setReferenceImageUrl: (u) => set({ referenceImageUrl: u }),
  setReferencePreviewImageUrl: (u) => set({ referencePreviewImageUrl: u }),

  // ── Bulk apply scene ───────────────────────────────────────────
  applyScene: (input) => {
    // Decide whether to flag a crossfade. v0.40.29: ALWAYS crossfade
    // on applyScene now, not just when the diff is 3+ pieces. The
    // user wanted clear visible feedback when a room loads — even
    // a 1-piece replacement benefits from a brief opacity transition
    // because the spatial context (walls, floor, palette) is also
    // changing. Without the crossfade, room loads felt abrupt and
    // the user couldn't tell what just happened.
    //
    // The earlier 3+ heuristic was over-conservative — we were
    // optimizing for snappiness on small swaps, but room swaps are
    // never small from the user's perspective: they redraw walls,
    // change palette, and reposition every piece simultaneously.
    const shouldCrossfade = true;

    set((s) => {
      const next: Partial<SceneSourceState> & {
        furniture?: PlacedItem[];
        walls?: Wall[];
        openings?: Opening[];
      } = {
        sceneSource: "room-director",
        roomMeta: input.roomMeta,
        currentStyleBible:
          input.styleBible ??
          (s as unknown as { currentStyleBible: StyleBible | null })
            .currentStyleBible,
        referenceImageUrl:
          input.referenceImageUrl ??
          (s as unknown as { referenceImageUrl: string | null })
            .referenceImageUrl,
        furniture: input.furniture,
        sceneTransitionActive: shouldCrossfade,
        // v0.40.30: clear any ad-hoc Reference-card preview override
        // when a new scene is applied. Stale previews from a prior
        // tile expansion shouldn't survive a scene swap.
        referencePreviewImageUrl: null,
      };

      // Wall synthesis: if the orchestrator/Claude returned an
      // explicit walls array (L-shape, U-shape rooms) use it as-is.
      // Otherwise — for the default rectangular case — synthesize 4
      // wall segments from roomMeta bounds so every wall consumer
      // gets real coordinates to work with.
      //
      // Why here, not in the renderers: collision detection
      // (WalkControls), 2D floor plan (FloorPlan2D), and 3D shell
      // (GeneratedApartment) all needed walls. Previously each
      // synthesized its own auto-rectangle on the fly, which led to
      // a real bug — WalkControls received an empty walls array and
      // had no collision surfaces, so the user could walk straight
      // through the room. Synthesizing once at the store level
      // guarantees every consumer sees the same walls.
      if (input.walls && input.walls.length > 0) {
        next.walls = input.walls;
      } else if (input.roomMeta) {
        const { minX, maxX, minZ, maxZ } = input.roomMeta;
        next.walls = [
          {
            id: "auto-n",
            x1: minX,
            z1: maxZ,
            x2: maxX,
            z2: maxZ,
            thickness: 0.15,
          },
          {
            id: "auto-s",
            x1: minX,
            z1: minZ,
            x2: maxX,
            z2: minZ,
            thickness: 0.15,
          },
          {
            id: "auto-e",
            x1: maxX,
            z1: minZ,
            x2: maxX,
            z2: maxZ,
            thickness: 0.15,
          },
          {
            id: "auto-w",
            x1: minX,
            z1: minZ,
            x2: minX,
            z2: maxZ,
            thickness: 0.15,
          },
        ];
      } else if (input.walls) {
        next.walls = input.walls;
      }
      if (input.openings) next.openings = input.openings;
      return next as Partial<SceneSourceState>;
    });

    // Auto-clear the transition flag after 500ms — Studio's overlay
    // listens to this and runs a CSS opacity transition during the
    // window. Using a setTimeout rather than CSS-only because we
    // need the flag to be true for the FULL duration (during which
    // the new scene is mounting + warming GLB shaders).
    if (shouldCrossfade && typeof window !== "undefined") {
      window.setTimeout(() => {
        set({ sceneTransitionActive: false });
      }, 500);
    }
  },

  // ── Patch one piece's meta on piece_ready events ──────────────
  patchItemMeta: (id, meta) => {
    set((s) => {
      const furniture =
        (s as unknown as { furniture?: PlacedItem[] }).furniture ?? [];
      return {
        furniture: furniture.map((f) =>
          f.id === id ? { ...f, meta: { ...(f.meta ?? {}), ...meta } } : f,
        ),
      } as unknown as Partial<SceneSourceState>;
    });
  },

  // ── Original scene snapshot ───────────────────────────────────
  freezeOriginalScene: () => {
    const s = get() as unknown as SceneSourceState & {
      furniture?: PlacedItem[];
      walls?: Wall[];
      openings?: Opening[];
    };
    set({
      originalScene: {
        sceneSource: s.sceneSource,
        // Shallow-clone arrays so later edits to the live state
        // don't mutate the frozen baseline. Each PlacedItem is also
        // shallow-cloned; meta is shallow-copied (immutable strings
        // / booleans, so this is safe).
        furniture: (s.furniture ?? []).map((f) => ({ ...f })),
        roomMeta: s.roomMeta,
        walls: (s.walls ?? []).map((w) => ({ ...w })),
        openings: (s.openings ?? []).map((o) => ({ ...o })),
        styleBible: s.currentStyleBible,
      },
    });
  },

  resetToOriginalScene: () => {
    const s = get() as unknown as SceneSourceState;
    if (!s.originalScene) return;
    const orig = s.originalScene;

    set({
      sceneSource: orig.sceneSource,
      roomMeta: orig.roomMeta,
      currentStyleBible: orig.styleBible,
      // Cross-slice writes:
      furniture: orig.furniture.map((f) => ({ ...f })),
      walls: orig.walls.map((w) => ({ ...w })),
      openings: orig.openings.map((o) => ({ ...o })),
    } as unknown as Partial<SceneSourceState>);
  },
});
