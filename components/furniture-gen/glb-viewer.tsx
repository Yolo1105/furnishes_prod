"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Center, Bounds } from "@react-three/drei";
import { Suspense } from "react";
import { useGlbHealthCheck } from "@/components/furniture-gen/glb-utils";
import { ClonedGltfPrimitive } from "@/components/furniture-gen/cloned-gltf-primitive";

export default function GlbViewer({ glbUrl }: { glbUrl: string }) {
  const health = useGlbHealthCheck(glbUrl);

  if (health.status === "error") {
    return (
      <div className="bg-destructive/10 text-destructive flex h-full items-center justify-center rounded p-6 text-sm">
        {health.message}
      </div>
    );
  }

  if (health.status === "checking") {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        Verifying 3D model…
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [2, 2, 2], fov: 45 }}
      shadows
      dpr={[1, 2]}
      className="h-full w-full"
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <Suspense fallback={null}>
        <Environment preset="studio" />
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <ClonedGltfPrimitive url={glbUrl} />
          </Center>
        </Bounds>
        <OrbitControls makeDefault />
      </Suspense>
    </Canvas>
  );
}
