"use client";

import { createContext, useContext, type ReactNode } from "react";

export type WorkspaceRailGateValue = { enabled: boolean };

const WorkspaceRailGateContext = createContext<WorkspaceRailGateValue>({
  enabled: false,
});

export function WorkspaceRailGateProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <WorkspaceRailGateContext.Provider value={{ enabled }}>
      {children}
    </WorkspaceRailGateContext.Provider>
  );
}

export function useWorkspaceRailGate(): WorkspaceRailGateValue {
  return useContext(WorkspaceRailGateContext);
}
