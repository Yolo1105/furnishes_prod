"use client";

import * as THREE from "three";
import { useEffect, useState } from "react";

export function ensureMaterials(scene: THREE.Object3D): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.material) {
      child.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    }
  });
}

export type GlbHealth =
  | { status: "checking" }
  | { status: "ok" }
  | { status: "error"; message: string };

export function useGlbHealthCheck(url: string | null): GlbHealth {
  const [health, setHealth] = useState<GlbHealth>({ status: "checking" });

  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setHealth({ status: "checking" });
      fetch(url, { method: "HEAD" })
        .then((res) => {
          if (cancelled) return;
          if (res.ok) {
            setHealth({ status: "ok" });
          } else {
            setHealth({
              status: "error",
              message: `GLB not accessible (HTTP ${res.status}). URL may have expired.`,
            });
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setHealth({
            status: "error",
            message:
              err instanceof Error
                ? `Network error loading GLB: ${err.message}`
                : "Network error loading GLB",
          });
        });
    };

    queueMicrotask(run);

    return () => {
      cancelled = true;
    };
  }, [url]);

  return health;
}
