"use client";

import React, { createContext, useContext } from "react";
import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";

type StudioWorkspaceSnapshotContextValue = {
  /** Latest validated-shaped snapshot from the image-gen workspace (rebuilt each render). */
  studioSnapshot: StudioSnapshotPayload | null;
};

const StudioWorkspaceSnapshotContext =
  createContext<StudioWorkspaceSnapshotContextValue | null>(null);

export function StudioWorkspaceSnapshotProvider({
  children,
  studioSnapshot,
}: {
  children: React.ReactNode;
  studioSnapshot: StudioSnapshotPayload | null;
}) {
  return (
    <StudioWorkspaceSnapshotContext.Provider value={{ studioSnapshot }}>
      {children}
    </StudioWorkspaceSnapshotContext.Provider>
  );
}

export function useStudioWorkspaceSnapshot(): StudioSnapshotPayload | null {
  const ctx = useContext(StudioWorkspaceSnapshotContext);
  return ctx?.studioSnapshot ?? null;
}
