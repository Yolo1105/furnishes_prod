"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, Center, Environment, OrbitControls } from "@react-three/drei";
import { Suspense, useLayoutEffect, useRef, type ElementRef } from "react";
import { ClonedGltfPrimitive } from "@/components/furniture-gen/cloned-gltf-primitive";
import type { ArrangeCameraMode } from "@/types/arrange-room";
import type { RoomDreiEnvironmentPreset, RoomPlacement } from "@/types/room";
import { studioPlacementForIndex } from "@/lib/furniture-gen/studio-placement-math";

function RoomFloor({
  widthM,
  depthM,
  floorColor,
}: {
  widthM: number;
  depthM: number;
  floorColor: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[widthM, depthM]} />
      <meshStandardMaterial color={floorColor} roughness={0.85} />
    </mesh>
  );
}

function BackWall({
  widthM,
  depthM,
  wallColor,
}: {
  widthM: number;
  depthM: number;
  wallColor: string;
}) {
  const h = Math.min(2.8, depthM * 0.9);
  return (
    <mesh position={[0, h / 2, -depthM / 2 + 0.02]} receiveShadow>
      <planeGeometry args={[widthM, h]} />
      <meshStandardMaterial color={wallColor} roughness={0.95} />
    </mesh>
  );
}

function PlacedFurniture({
  placements,
  widthM,
}: {
  placements: RoomPlacement[];
  widthM: number;
}) {
  if (placements.length === 0) return null;

  const n = placements.length;

  return (
    <>
      {placements.map((p, i) => {
        const { x, z } = studioPlacementForIndex({
          widthM,
          placedCount: n,
          orderIndex: i,
        });
        return (
          <group key={p.key} position={[x, 0, z]}>
            <Suspense fallback={null}>
              <Bounds fit clip margin={0.85}>
                <Center>
                  <ClonedGltfPrimitive url={p.glbUrl} castShadowMeshes />
                </Center>
              </Bounds>
            </Suspense>
          </group>
        );
      })}
    </>
  );
}

type CameraRigProps = {
  maxDim: number;
  cameraMode: ArrangeCameraMode;
  cameraResetNonce: number;
};

type OrbitControlsHandle = ElementRef<typeof OrbitControls>;

function RoomCameraRig({
  maxDim,
  cameraMode,
  cameraResetNonce,
}: CameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsHandle>(null);

  useLayoutEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;

    if (cameraMode === "topDown") {
      const h = maxDim * 2.85;
      camera.position.set(0, h, 0.0001);
      camera.up.set(0, 1, 0);
      ctrl.target.set(0, 0, 0);
      ctrl.minPolarAngle = Math.PI / 2 - 0.02;
      ctrl.maxPolarAngle = Math.PI / 2 - 0.02;
    } else {
      camera.up.set(0, 1, 0);
      camera.position.set(maxDim * 0.65, maxDim * 0.45, maxDim * 0.85);
      ctrl.target.set(0, 0.4, 0);
      ctrl.minPolarAngle = 0;
      ctrl.maxPolarAngle = Math.PI / 2 - 0.08;
    }
    ctrl.minDistance = maxDim * 0.35;
    ctrl.maxDistance = maxDim * 4;
    ctrl.update();
  }, [camera, cameraMode, cameraResetNonce, maxDim]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 0.4, 0]}
      minDistance={maxDim * 0.35}
      maxDistance={maxDim * 4}
    />
  );
}

export type RoomFurnitureSceneProps = {
  widthM: number;
  depthM: number;
  lightingPreset: RoomDreiEnvironmentPreset;
  placements: RoomPlacement[];
  floorColor: string;
  wallColor: string;
  cameraMode?: ArrangeCameraMode;
  /** Increment to snap camera back to the current mode default. */
  cameraResetNonce?: number;
};

export default function RoomFurnitureScene({
  widthM,
  depthM,
  lightingPreset,
  placements,
  floorColor,
  wallColor,
  cameraMode = "orbit",
  cameraResetNonce = 0,
}: RoomFurnitureSceneProps) {
  const maxDim = Math.max(widthM, depthM, 2);

  return (
    <Canvas
      camera={{
        position: [maxDim * 0.65, maxDim * 0.45, maxDim * 0.85],
        fov: 45,
        near: 0.1,
        far: maxDim * 40,
      }}
      shadows
      dpr={[1, 2]}
      className="h-full w-full"
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#f4f0e8"]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[maxDim * 2, maxDim * 3, maxDim * 2]}
        intensity={1.1}
        castShadow
      />
      <Suspense fallback={null}>
        <Environment preset={lightingPreset} />
        <RoomFloor widthM={widthM} depthM={depthM} floorColor={floorColor} />
        <BackWall widthM={widthM} depthM={depthM} wallColor={wallColor} />
        <PlacedFurniture placements={placements} widthM={widthM} />
        <RoomCameraRig
          maxDim={maxDim}
          cameraMode={cameraMode}
          cameraResetNonce={cameraResetNonce}
        />
      </Suspense>
    </Canvas>
  );
}
