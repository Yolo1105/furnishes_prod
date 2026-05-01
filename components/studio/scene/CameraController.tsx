"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@studio/store";
import { CAMERA_PRESETS } from "@studio/three/cameraPresets";

/**
 * Listens to the store's camera-control values and animates the
 * camera + orbit-controls target accordingly.
 *
 *   • `cameraResetVersion` bumps      — fly to preset 0 (Default)
 *   • `cameraPresetIndex` changes     — fly to that preset
 *   • `pendingCameraFly.version` bumps — fly to its position+target
 *
 * Animation runs each frame via a per-axis exponential lerp. We
 * use a manual lerp rather than a tween library because the only
 * motion we ever do is linear interpolation toward a single target
 * — and the OrbitControls instance has to be updated alongside the
 * camera so user drag remains responsive after the animation.
 *
 * Mounted as a child of the Canvas so `useFrame` / `useThree`
 * resolve. OrbitControls is given `makeDefault` so `useThree().controls`
 * resolves to it.
 */

const LERP_SPEED = 4.5;
const FINISHED_EPS = 0.005;

interface PendingFly {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export function CameraController() {
  const { camera, controls } = useThree() as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };

  const cameraResetVersion = useStore((s) => s.cameraResetVersion);
  const cameraPresetIndex = useStore((s) => s.cameraPresetIndex);
  const pendingCameraFly = useStore((s) => s.pendingCameraFly);
  // The apartment is no longer centered at origin (normalize.ts
  // preserves raw X/Z so walls and furniture coord-align in the
  // 2D plan). Offset every preset's position + target by the
  // apartment's actual (X, Z) center, so the camera still points
  // at the room. Y stays untouched — the floor is already snapped
  // to y = 0 by normalize.
  const apartmentCenter = useStore((s) => s.apartmentCenter);

  const offset = (vec: THREE.Vector3): THREE.Vector3 => {
    if (!apartmentCenter) return vec;
    return new THREE.Vector3(
      vec.x + apartmentCenter[0],
      vec.y,
      vec.z + apartmentCenter[1],
    );
  };

  const pending = useRef<PendingFly | null>(null);

  // Track the prior values of every input so we can tell which one
  // changed when the effect fires.
  const prevReset = useRef(cameraResetVersion);
  const prevPreset = useRef(cameraPresetIndex);
  const prevFlyVersion = useRef(pendingCameraFly?.version ?? 0);

  useEffect(() => {
    let target: PendingFly | null = null;

    if (cameraResetVersion !== prevReset.current) {
      const p = CAMERA_PRESETS[0];
      target = {
        position: offset(new THREE.Vector3(...p.position)),
        target: offset(new THREE.Vector3(...p.target)),
      };
    } else if (cameraPresetIndex !== prevPreset.current) {
      const p = CAMERA_PRESETS[cameraPresetIndex % CAMERA_PRESETS.length];
      target = {
        position: offset(new THREE.Vector3(...p.position)),
        target: offset(new THREE.Vector3(...p.target)),
      };
    } else if (
      pendingCameraFly &&
      pendingCameraFly.version !== prevFlyVersion.current
    ) {
      target = {
        position: new THREE.Vector3(...pendingCameraFly.position),
        target: new THREE.Vector3(...pendingCameraFly.target),
      };
    }

    prevReset.current = cameraResetVersion;
    prevPreset.current = cameraPresetIndex;
    prevFlyVersion.current = pendingCameraFly?.version ?? 0;

    if (target) pending.current = target;
  }, [
    cameraResetVersion,
    cameraPresetIndex,
    pendingCameraFly,
    apartmentCenter,
  ]);

  // When the apartment center first becomes known (after seedFromGlb
  // runs), apply the default preset so the camera snaps to the room
  // rather than staying at its initial origin-centered position.
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (!apartmentCenter || appliedInitial.current) return;
    appliedInitial.current = true;
    const p = CAMERA_PRESETS[0];
    pending.current = {
      position: offset(new THREE.Vector3(...p.position)),
      target: offset(new THREE.Vector3(...p.target)),
    };
  }, [apartmentCenter]);

  useFrame((_, delta) => {
    const fly = pending.current;
    if (!fly) return;

    const t = 1 - Math.exp(-LERP_SPEED * delta);

    camera.position.lerp(fly.position, t);
    if (controls) {
      controls.target.lerp(fly.target, t);
      controls.update();
    }

    if (
      camera.position.distanceTo(fly.position) < FINISHED_EPS &&
      (!controls || controls.target.distanceTo(fly.target) < FINISHED_EPS)
    ) {
      camera.position.copy(fly.position);
      if (controls) {
        controls.target.copy(fly.target);
        controls.update();
      }
      pending.current = null;
    }
  });

  return null;
}
