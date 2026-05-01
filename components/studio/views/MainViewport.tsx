"use client";

import dynamic from "next/dynamic";
import { useStore } from "@studio/store";
import { FloorPlan2D } from "@studio/views/FloorPlan2D";

/**
 * Full-viewport main view. Reads `mainViewMode` from the store and
 * mounts either the 3D Scene (the GLB + lights + controls) or the
 * 2D floor plan SVG. The Reference floating card shows the other
 * mode, so the two are always paired.
 *
 * The 3D Scene is dynamically imported with ssr disabled because
 * R3F's Canvas cannot render server-side. We import here rather
 * than in the parent so this component owns the entire viewport-
 * filling concern.
 */
const Scene = dynamic(
  () => import("@studio/scene/Scene").then((m) => ({ default: m.Scene })),
  { ssr: false },
);

export function MainViewport() {
  const mode = useStore((s) => s.mainViewMode);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
      }}
    >
      {mode === "3d" ? (
        <Scene />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <div
            style={{
              width: "min(900px, 80vmin)",
              maxHeight: "85vh",
              aspectRatio: "200 / 160",
            }}
          >
            <FloorPlan2D compact={false} />
          </div>
        </div>
      )}
    </div>
  );
}
