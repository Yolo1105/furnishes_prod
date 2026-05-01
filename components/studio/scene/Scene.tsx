"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useState } from "react";
import { Apartment } from "./Apartment";
import { GeneratedApartment } from "./GeneratedApartment";
import { FurnitureMeshes } from "./FurnitureMeshes";
import { CameraController } from "./CameraController";
import { FloorHotspots } from "./FloorHotspots";
import { SelectionIndicator } from "./SelectionIndicator";
import { RotationGizmo } from "./RotationGizmo";
import { TranslationGizmo } from "./TranslationGizmo";
import { AxisHandles } from "./AxisHandles";
import { CollisionOutlines as _CollisionOutlinesUnused } from "./CollisionOutlines";
// CollisionOutlines is intentionally unmounted (see comment in Scene's
// JSX). Import retained but unused so a future re-enable doesn't have
// to re-add it. The `_CollisionOutlinesUnused` alias keeps the
// no-unused-vars lint quiet without removing the line.
void _CollisionOutlinesUnused;
import { WalkControls } from "./WalkControls";
import { TourCamera } from "./TourCamera";
import { CAMERA_PRESETS } from "@studio/three/cameraPresets";
import { useStudioShellKind } from "@studio/hooks/useStudioShellKind";
import { useStore } from "@studio/store";
import { GlContextLifecycle } from "./GlContextLifecycle";

/**
 * The 3D scene that fills the entire viewport behind the chat. The
 * canvas is rendered with `alpha: true` so the body's radial
 * gradient shows through above the apartment and in any negative
 * space.
 *
 * Composed pieces, mounted as Canvas children:
 *   • Lights         — ambient + key directional + cool fill
 *   • Environment    — drei HDRI; preset is store-driven
 *   • Apartment      — the GLB, suspends while loading
 *   • OrbitControls  — orbit-mode camera (damped, clamped); only
 *                      mounted while `cameraMode === "orbit"`
 *   • WalkControls   — first-person camera; only mounted while
 *                      `cameraMode === "walk"`. WASD + mouse-look
 *                      with wall collision.
 *   • CameraController — animates camera on store events
 *                       (reset / preset shuffle / hotspot fly)
 *   • FloorHotspots  — clickable accent disks; click teleports
 *                      into walk mode at that spot
 */
export function Scene() {
  const envPreset = useStore((s) => s.envPreset);
  const cardinalLightsMode = useStore((s) => s.cardinalLightsMode);
  // v0.40.48: read openings so the cardinal-lights rig can place
  // its directional lights to match actual window positions when
  // the room has them. Falls back to N/S/E/W cardinals when there
  // are no windows in the scene (e.g. viewer-source apartments).
  const openings = useStore((s) => s.openings);
  const cameraMode = useStore((s) => s.cameraMode);
  const setCameraMode = useStore((s) => s.setCameraMode);
  const setWalkTeleportTarget = useStore((s) => s.setWalkTeleportTarget);
  const shellKind = useStudioShellKind();
  // Tour mode is exclusive — when active, neither OrbitControls nor
  // WalkControls render; TourCamera fully owns the camera until the
  // path completes (or the user explicitly stops the tour from the
  // top bar).
  const tourActive = useStore((s) => s.tourActive);

  // v0.40.26: Single-piece preview detection. When the user has
  // generated ONE piece via Furniture mode (no apartment context yet),
  // the camera should orbit freely so the piece can be inspected from
  // every angle — including from below. In apartment mode (multiple
  // pieces in a room shell), the camera stays clamped above the
  // floor plane to prevent clipping into the apartment shell.
  //
  // The detection: GLB apartment shell AND there's at most ONE placed
  // piece. Once the user generates a room or
  // places multiple pieces, normal apartment-mode polar clamps
  // re-engage.
  const placedCount = useStore(
    (s) => (s.furniture ?? []).filter((f) => f.placed).length,
  );
  const singlePiecePreview = shellKind === "apartment" && placedCount <= 1;

  const [defaultPos, defaultTarget] = [
    CAMERA_PRESETS[0].position,
    CAMERA_PRESETS[0].target,
  ];

  const [canvasKey, setCanvasKey] = useState(0);
  const remountCanvas = useCallback(() => {
    setCanvasKey((k) => k + 1);
  }, []);

  return (
    <Canvas
      key={canvasKey}
      camera={{ position: defaultPos, fov: 45, near: 0.1, far: 100 }}
      gl={{
        alpha: true,
        antialias: true,
        // Logarithmic depth eliminates flickering between coplanar
        // surfaces (window glass against walls, layered finishes).
        // The GLB has many of these — without log-depth there is
        // visible z-fighting at distance.
        logarithmicDepthBuffer: true,
        powerPreference: "default",
      }}
      // Cap DPR to reduce VRAM / context-loss risk with HDRI + large GLB.
      dpr={[1, 1.5]}
      style={{ background: "transparent" }}
    >
      <GlContextLifecycle onRemountCanvas={remountCanvas} />
      {/* Lighting */}
      {cardinalLightsMode ? (
        // v0.40.47/48: model-inspection rig — equal-strength
        // directional lights from each window's outside direction
        // when the scene has windows; falls back to fixed N/S/E/W
        // cardinals when there are none. Each light fills one set
        // of faces so albedo, baked shadows, and one-sided materials
        // show clearly. Ambient is brighter (0.7) and warmer-neutral
        // so the result reads as "studio light" rather than "interior
        // scene." The HDRI <Environment> still contributes for
        // reflections; only the directional rig changes between modes.
        //
        // Coordinate convention: Y-up. World X is east-west, Z is
        // north-south. For each window we place a light OUTSIDE the
        // wall the window sits on, pointing toward the window's
        // midpoint. The outward direction is computed from the
        // window's segment endpoints: a horizontal window (z1 ≈ z2)
        // is on a north or south wall — outside is in the +Z or -Z
        // direction depending on the wall's distance from origin.
        // Likewise vertical windows (x1 ≈ x2) get +X or -X outside.
        <>
          <ambientLight color={0xfff8ee} intensity={0.7} />
          {(() => {
            const windows = (openings ?? []).filter((o) => o.kind === "window");
            if (windows.length === 0) {
              // No windows in scene → use fixed cardinal positions.
              return (
                <>
                  {/* North (+Z) */}
                  <directionalLight
                    color={0xffffff}
                    intensity={0.6}
                    position={[0, 4, 8]}
                  />
                  {/* East (+X) */}
                  <directionalLight
                    color={0xffffff}
                    intensity={0.6}
                    position={[8, 4, 0]}
                  />
                  {/* South (-Z) */}
                  <directionalLight
                    color={0xffffff}
                    intensity={0.6}
                    position={[0, 4, -8]}
                  />
                  {/* West (-X) */}
                  <directionalLight
                    color={0xffffff}
                    intensity={0.6}
                    position={[-8, 4, 0]}
                  />
                </>
              );
            }
            // Place one light per window, on the outside of the
            // wall, casting toward the window's midpoint. Distance
            // 4m beyond the wall keeps the cone wide enough to fill
            // the room without over-exposing edges. Intensity scales
            // 1/N so a many-windowed room doesn't blow out — 0.6 was
            // the per-light intensity for the 4-window cardinal
            // fallback, so we use 0.6 × (4 / N).
            const intensity = 0.6 * (4 / Math.max(windows.length, 4));
            return windows.map((w, i) => {
              const midX = (w.x1 + w.x2) / 2;
              const midZ = (w.z1 + w.z2) / 2;
              const segDX = w.x2 - w.x1;
              const segDZ = w.z2 - w.z1;
              // Outward normal: perpendicular to the segment,
              // pointing away from origin (assume room is roughly
              // centered at 0,0).
              const horizontal = Math.abs(segDX) > Math.abs(segDZ);
              let outX = 0,
                outZ = 0;
              if (horizontal) {
                outZ = midZ >= 0 ? 1 : -1; // outside above/below
              } else {
                outX = midX >= 0 ? 1 : -1; // outside right/left
              }
              const dist = 4;
              return (
                <directionalLight
                  key={w.id ?? `win-${i}`}
                  color={0xffffff}
                  intensity={intensity}
                  position={[midX + outX * dist, 4, midZ + outZ * dist]}
                />
              );
            });
          })()}
        </>
      ) : (
        <>
          <ambientLight color={0xfff2e4} intensity={0.45} />
          <directionalLight
            color={0xffd8b0}
            intensity={0.8}
            position={[5, 7, 4]}
          />
          <directionalLight
            color={0xffffff}
            intensity={0.18}
            position={[-4, 3, -2]}
          />
        </>
      )}

      {/* HDRI — drives reflections + image-based lighting. The
          `background={false}` keeps the body's CSS gradient as the
          backdrop rather than the HDRI cubemap. */}
      <Environment preset={envPreset} background={false} />

      {/* Suspends while the GLB loads (apartment shell). */}
      <Suspense fallback={null}>
        {shellKind === "generated" ? (
          // Generated rooms: synthetic floor + walls from roomMeta only.
          <GeneratedApartment />
        ) : shellKind === "apartment" ? (
          <Apartment url="/studio/apartamento.glb" />
        ) : null}
      </Suspense>

      {/* Generated furniture meshes — placeholder boxes during the
          streaming phase, real GLB-loaded meshes once piece_ready
          events have attached glbUrls. Self-gates per item: skips
          all viewer-source pieces (the apartamento.glb is their
          visual layer). Mounted unconditionally so the same
          components handle both source modes' furniture. */}
      <FurnitureMeshes />

      {/* Renders an orange wireframe box around the currently-
          selected inventory item's meshes. Reads from the slice
          and recomputes only when selection / placement / visibility
          changes — no per-frame cost. */}
      <SelectionIndicator />

      {/* Rotation gizmo (Phase C2-redux). Orange torus around the
          selected item; drag to rotate, hold Shift to snap to 15°.
          Self-gates on selectedId, cameraMode === "orbit", and
          !tourActive. Writes to setItemTransform; the Apartment
          subscriber picks up the rotation field and writes it
          to the item's wrapping group. Pure assignment, no drift. */}
      <RotationGizmo />

      {/* Translation gizmo — drag the currently-selected item across
          the floor. Behavior-only mount (renders nothing). Press on
          the selected item's mesh body, drag to translate, release
          to drop. Disables OrbitControls during the drag so the
          camera doesn't orbit at the same time. Locked items are
          skipped. */}
      <TranslationGizmo />

      {/* AxisHandles — visible axis arrows for explicit X/Z drag.
          Self-gates on translateMode (default off). Sibling to
          TranslationGizmo: TranslationGizmo gives users always-on
          body-drag (click + drag the piece itself), AxisHandles
          adds visible arrows when the user wants axis-constrained
          motion. Both write to setItemTransform. */}
      <AxisHandles />

      {/* Collision outlines disabled (was: <CollisionOutlines />). The
          red wireframe overlay was intended as a "this is wrong" hint
          when items overlap, but on initial catalog seed many items
          share the same centroid, so the indicator paints every piece
          red and reads as broken UI rather than helpful warning. F4
          Health's overlap row covers the same data without the visual
          noise. Re-enable by importing + mounting if you want it back
          for a specific debugging session. */}
      {/* Floor hotspots — only rendered in orbit mode and outside
          tour playback. Clicking one stashes the (x, z) into the
          slice's walkTeleportTarget, flips cameraMode to "walk",
          and WalkControls picks up the target on its next frame. */}
      {cameraMode === "orbit" && !tourActive && (
        <FloorHotspots
          onPick={([x, _y, z]) => {
            setWalkTeleportTarget({ x, z });
            setCameraMode("walk");
          }}
        />
      )}

      {/* Camera controls — exactly one of three modes is active:
          tour (TourCamera), walk (WalkControls), or orbit
          (OrbitControls). Switching unmounts the previous one so
          neither's frame handlers run while inactive. */}
      {tourActive ? (
        <TourCamera />
      ) : cameraMode === "orbit" ? (
        <OrbitControls
          target={defaultTarget}
          enableDamping
          dampingFactor={0.08}
          // v0.40.28: drop minDistance further (0.1m vs 0.5m) so the
          // user can orbit really close to inspect mesh details. The
          // user explicitly asked for "no limit" on the camera; this
          // and the polar limits below are as relaxed as we can make
          // them without breaking apartment-mode floor clipping.
          minDistance={singlePiecePreview ? 0.1 : 3}
          maxDistance={25}
          // v0.40.26: free-sphere orbit when in single-piece preview
          // (no apartment shell to clip below). The user's explicit
          // ask: "for single furniture view should not have limit in
          // the rotate angle in any way, should be free." Apartment
          // mode keeps the standard above-floor clamp so the camera
          // can't tunnel below the floor.
          minPolarAngle={singlePiecePreview ? 0 : 0.1}
          maxPolarAngle={singlePiecePreview ? Math.PI : Math.PI / 2 - 0.05}
          makeDefault
        />
      ) : (
        <WalkControls />
      )}

      {/* CameraController is paused implicitly during tour because
          tourActive blocks any new fly target from being set, but
          we keep it mounted so post-tour resets / shuffles still
          work as soon as the tour ends. */}
      <CameraController />
    </Canvas>
  );
}
