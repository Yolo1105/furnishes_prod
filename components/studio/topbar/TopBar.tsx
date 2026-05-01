"use client";

import { useStore } from "@studio/store";
import { buildTourPath } from "@studio/three/tourPath";
import {
  UndoIcon,
  RedoIcon,
  HomeViewIcon,
  Rotate3DIcon,
  ShuffleIcon,
  ClipboardListIcon,
  MapIcon,
  HelpCircleIcon,
  SparkleIcon,
  FootprintsIcon,
  RewindIcon,
  MoveIcon,
} from "@studio/icons";
import { TopBarButton, TopBarDivider } from "./TopBarButton";
import { ViewSettingsDropdown } from "./ViewSettingsDropdown";

/**
 * Top-center toolbar — the app's "global state / quick actions"
 * surface. Ten controls in five logical groups, separated by thin
 * vertical dividers. Position-fixed top-center, z-index 5 (same
 * tier as project card, tools card, ChatDock).
 *
 * Every button is functional:
 *
 * Group 1 — History
 *   Undo / Redo — disabled when stacks are empty (which they are
 *   while there's no furniture state to undo). Wires the existing
 *   history-slice; will light up the moment furniture editing
 *   starts pushing snapshots.
 *
 * Group 2 — Layout actions
 *   Reset      — bumps `cameraResetVersion`; the CameraController
 *                animates the camera back to the default preset.
 *   Shuffle    — advances `cameraPresetIndex` through the six
 *                cinematic presets defined in cameraPresets.ts.
 *
 * Group 3 — Visual / scene
 *   Post-FX    — toggles the EffectComposer (Bloom + Vignette).
 *   Hotspots   — toggles the floor hotspot disks; clicking a
 *                hotspot flies the camera to view that spot.
 *   Env light. — drei HDRI swap; ten presets in the dropdown.
 *
 * Group 4 — Workflow entry points (Coming-soon cards for now)
 *   Planner / Tour — open a small explanatory floating card.
 *
 * Group 5 — Help — opens HelpModal with shortcuts + camera + start.
 */
export function TopBar() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const undoDepth = useStore((s) => s.undoStack.length);
  const redoDepth = useStore((s) => s.redoStack.length);

  const cameraMode = useStore((s) => s.cameraMode);
  const setCameraMode = useStore((s) => s.setCameraMode);

  // Tour state — Tour button starts/stops; auto-builds the path
  // from waypoints (if any) or from visible furniture.
  const tourActive = useStore((s) => s.tourActive);
  const startTour = useStore((s) => s.startTour);
  const stopTour = useStore((s) => s.stopTour);
  const customWaypoints = useStore((s) => s.customWaypoints);
  const furniture = useStore((s) => s.furniture);
  const apartmentCenter = useStore((s) => s.apartmentCenter);

  const resetCamera = useStore((s) => s.resetCamera);
  const shuffleCameraPreset = useStore((s) => s.shuffleCameraPreset);

  // Rotate mode — when enabled, the rotation gizmo (orange torus
  // around the selected item) becomes visible. Default off so the
  // scene stays clean when the user is just selecting and inspecting.
  const rotateMode = useStore((s) =>
    Boolean((s as unknown as { rotateMode?: boolean }).rotateMode),
  );
  const setRotateMode = useStore(
    (s) =>
      (s as unknown as { setRotateMode: (b: boolean) => void }).setRotateMode,
  );

  // Translate mode — when enabled, the AxisHandles gizmo (4 arrows +
  // center pad around the selected item) becomes visible. Sibling
  // toggle to rotateMode; default off.
  const translateMode = useStore((s) =>
    Boolean((s as unknown as { translateMode?: boolean }).translateMode),
  );
  const setTranslateMode = useStore(
    (s) =>
      (s as unknown as { setTranslateMode: (b: boolean) => void })
        .setTranslateMode,
  );

  // Reset-to-original — only meaningful when a generation has been
  // frozen as originalScene. The button is hidden when null
  // (typical viewer-source projects where there's nothing to reset
  // to other than the apartment GLB itself).
  const originalScene = useStore((s) => s.originalScene);
  const resetToOriginalScene = useStore((s) => s.resetToOriginalScene);

  const setPlannerOpen = useStore((s) => s.setPlannerOpen);
  const setHelpModalOpen = useStore((s) => s.setHelpModalOpen);
  const setSuggestionsModalOpen = useStore((s) => s.setSuggestionsModalOpen);

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
      }}
    >
      <div
        className="glass"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          borderRadius: 12,
          padding: 5,
        }}
      >
        {/* Group 1 — History */}
        <TopBarButton
          onClick={() => undo()}
          disabled={undoDepth === 0}
          title={`Undo${undoDepth > 0 ? ` (${undoDepth})` : " — nothing to undo yet"}`}
        >
          <UndoIcon size={14} />
        </TopBarButton>
        <TopBarButton
          onClick={() => redo()}
          disabled={redoDepth === 0}
          title={`Redo${redoDepth > 0 ? ` (${redoDepth})` : " — nothing to redo"}`}
        >
          <RedoIcon size={14} />
        </TopBarButton>

        <TopBarDivider />

        {/* Group 2 — Layout / camera actions */}
        <TopBarButton
          onClick={() => resetCamera()}
          title="Reset camera to default view"
        >
          <HomeViewIcon size={14} />
        </TopBarButton>
        <TopBarButton
          onClick={() => shuffleCameraPreset()}
          title="Shuffle camera angle"
        >
          <ShuffleIcon size={14} />
        </TopBarButton>
        {/* Rotate-mode toggle. When active, the orange torus gizmo
            renders around the currently-selected item. The user
            asked specifically that the rotate ring not appear by
            default — so this button is the explicit opt-in. The
            button itself shows an "active" treatment (filled accent
            background) when rotateMode is on. */}
        <TopBarButton
          onClick={() => setRotateMode(!rotateMode)}
          title={rotateMode ? "Rotate mode: ON" : "Rotate mode: OFF"}
          active={rotateMode}
        >
          <Rotate3DIcon size={14} />
        </TopBarButton>
        {/* Translate-mode toggle. Sibling to rotate-mode. When active,
            visible axis arrows render around the selected item so the
            user can drag along X or Z, or grab the center pad for free
            X/Z motion. Body-drag (TranslationGizmo, behavior-only) is
            still always available — these are additive visible handles. */}
        <TopBarButton
          onClick={() => setTranslateMode(!translateMode)}
          title={translateMode ? "Move mode: ON" : "Move mode: OFF"}
          active={translateMode}
        >
          <MoveIcon size={14} />
        </TopBarButton>

        {/* Reset-to-original — only present when a generated scene
            has been frozen. Confirms before applying so the user
            doesn't accidentally lose edits. */}
        {originalScene !== null && (
          <TopBarButton
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                window.confirm(
                  "Reset to the original generated scene? Your edits will be discarded.",
                )
              ) {
                resetToOriginalScene();
              }
            }}
            title="Reset to the original generated scene (discards edits)"
          >
            <RewindIcon size={14} />
          </TopBarButton>
        )}

        <TopBarDivider />

        {/* Group 3 — Visual / scene inspection. v0.40.49: collapsed
            from 4 separate buttons (hotspots, walk, env, cardinal)
            into walk-mode + a single ViewSettings popover that
            consolidates hotspots + cardinal lights + HDRI preset.
            Walk mode stays as a single-click toggle because it's a
            navigation action, not a visual setting. */}
        <TopBarButton
          onClick={() =>
            setCameraMode(cameraMode === "walk" ? "orbit" : "walk")
          }
          active={cameraMode === "walk"}
          title={
            cameraMode === "walk"
              ? "Exit walk mode (Esc)"
              : "Walk mode — first-person; WASD to move, mouse to look"
          }
        >
          <FootprintsIcon size={14} />
        </TopBarButton>
        <ViewSettingsDropdown />

        <TopBarDivider />

        {/* Group 4 — Workflow entry points */}
        <TopBarButton
          onClick={() => setPlannerOpen(true)}
          title="Planner — design requirements + AI options"
        >
          <ClipboardListIcon size={14} />
        </TopBarButton>
        <TopBarButton
          onClick={() => {
            if (tourActive) {
              stopTour();
              return;
            }
            // Build path from waypoints if any, else auto-generate
            // from key furniture positions. The path generator is
            // tolerant — returns [] when there's no data, in which
            // case startTour is a no-op (tourPath.length < 2 fails
            // the TourCamera guard).
            const path = buildTourPath(
              customWaypoints,
              furniture,
              apartmentCenter,
            );
            if (path.length >= 2) startTour(path);
          }}
          active={tourActive}
          title={
            tourActive
              ? "Stop tour"
              : customWaypoints.length > 0
                ? `Start tour through your ${customWaypoints.length} waypoints`
                : "Start tour — auto-flythrough through key items"
          }
        >
          <MapIcon size={14} />
        </TopBarButton>

        <TopBarDivider />

        {/* Group 5 — Suggestions (Turn 5) + Help */}
        <TopBarButton
          onClick={() => setSuggestionsModalOpen(true)}
          title="Design suggestions — proactive observations from the brain"
        >
          <SparkleIcon size={14} />
        </TopBarButton>
        <TopBarButton
          onClick={() => setHelpModalOpen(true)}
          title="Help — shortcuts + quick start"
        >
          <HelpCircleIcon size={14} />
        </TopBarButton>
      </div>
    </div>
  );
}
