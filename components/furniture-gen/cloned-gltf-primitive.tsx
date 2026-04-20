"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { ensureMaterials } from "@/components/furniture-gen/glb-utils";

/**
 * Shared GLB display: clone scene, fix materials, optional mesh shadows (room scene).
 */
export function ClonedGltfPrimitive({
  url,
  castShadowMeshes = false,
}: {
  url: string;
  castShadowMeshes?: boolean;
}) {
  const { scene } = useGLTF(url);
  const prepared = useMemo(() => {
    const cloned = scene.clone(true);
    ensureMaterials(cloned);
    if (castShadowMeshes) {
      cloned.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
    }
    return cloned;
  }, [scene, castShadowMeshes]);
  return <primitive object={prepared} />;
}
