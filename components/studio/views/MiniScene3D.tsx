"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useState } from "react";
import { Apartment } from "@studio/scene/Apartment";
import { GeneratedApartment } from "@studio/scene/GeneratedApartment";
import { FurnitureMeshes } from "@studio/scene/FurnitureMeshes";
import { GlContextLifecycle } from "@studio/scene/GlContextLifecycle";
import { useStudioShellKind } from "@studio/hooks/useStudioShellKind";
import { useStore } from "@studio/store";

/**
 * Compact 3D scene used inside the Reference card when the main
 * viewport is in 2D mode. Shares the GLB through drei's `useGLTF`
 * cache so loading the apartment a second time is instant — only
 * a fresh WebGL context + light pass is added.
 *
 * Lighter setup than the main Scene:
 *   • No post-processing
 *   • No camera controller (no need to react to top-bar actions —
 *     this view is for inspection, not navigation)
 *   • No floor hotspots
 *   • Same env-preset binding so lighting stays in sync
 *
 * Shell branching matches `Scene.tsx` via `useStudioShellKind` so
 * room-director + missing roomMeta still mounts the demo GLB.
 */
export function MiniScene3D() {
  const envPreset = useStore((s) => s.envPreset);
  const shellKind = useStudioShellKind();

  const [canvasKey, setCanvasKey] = useState(0);
  const remountCanvas = useCallback(() => {
    setCanvasKey((k) => k + 1);
  }, []);

  return (
    <Canvas
      key={canvasKey}
      camera={{ position: [9, 7, 9], fov: 45, near: 0.1, far: 100 }}
      gl={{
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true,
        powerPreference: "default",
      }}
      dpr={[1, 1.5]}
      style={{ background: "transparent" }}
    >
      <GlContextLifecycle onRemountCanvas={remountCanvas} />
      <ambientLight color={0xfff2e4} intensity={0.45} />
      <directionalLight color={0xffd8b0} intensity={0.8} position={[5, 7, 4]} />
      <directionalLight
        color={0xffffff}
        intensity={0.18}
        position={[-4, 3, -2]}
      />

      <Environment preset={envPreset} background={false} />

      <Suspense fallback={null}>
        {shellKind === "generated" ? (
          <GeneratedApartment />
        ) : shellKind === "apartment" ? (
          <Apartment url="/studio/apartamento.glb" />
        ) : null}
      </Suspense>

      <FurnitureMeshes />

      <OrbitControls
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={22}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
