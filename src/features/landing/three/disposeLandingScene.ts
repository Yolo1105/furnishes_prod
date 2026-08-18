import type * as THREE from "three-landing";

/**
 * Dispose geometries, materials, maps, and the renderer. Call before mounting
 * any second Landing WebGL context (hero).
 */
export function disposeLandingScene(
  renderer: THREE.WebGLRenderer,
  scene?: THREE.Scene | null,
) {
  renderer.setAnimationLoop(null);

  if (scene) {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : [];
      for (const material of materials) {
        if (!material) continue;
        const maps = [
          "map",
          "alphaMap",
          "bumpMap",
          "normalMap",
          "roughnessMap",
          "metalnessMap",
          "emissiveMap",
          "aoMap",
          "envMap",
        ] as const;
        for (const key of maps) {
          const map = (material as THREE.MeshStandardMaterial)[key];
          if (map && "dispose" in map) map.dispose();
        }
        material.dispose();
      }
    });
  }

  renderer.dispose();
  try {
    renderer.forceContextLoss();
  } catch {
    // Some browsers reject forceContextLoss after dispose; ignore.
  }
  renderer.domElement.remove();
}
