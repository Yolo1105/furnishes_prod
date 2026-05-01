"use client";

import { useStore } from "@studio/store";

export type StudioShellKind = "blank" | "generated" | "apartment";

/** Matches Scene.tsx / MiniScene3D apartment-shell branching (single source). */
export function useStudioShellKind(): StudioShellKind {
  return useStore((s) => {
    const blank = Boolean(
      s.projects.find((p) => p.id === s.currentProjectId)?.blankScene,
    );
    if (blank) return "blank";
    if (s.sceneSource === "room-director" && s.roomMeta != null) {
      return "generated";
    }
    return "apartment";
  });
}
