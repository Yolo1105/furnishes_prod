"use client";

/**
 * contexts/ProjectContext.tsx
 *
 * ⚠️  STUB — This file was generated with assumed types.
 * Please confirm (or correct) the field names and types
 * before using in production.
 *
 * Assumed shape (from sidebar panel descriptions):
 *   StylePack:  { direction: string, palette: string[], mood?: string }
 *   BudgetPlan: { total: number, spent: number, currency: string }
 *   RoomConfig: { name?: string, width: number, length: number, height?: number, unit: 'ft'|'m' }
 *
 * Questions:
 *   3. Is StylePack.direction a plain string, or an enum/ID?
 *   4. Does BudgetPlan use 'total'/'spent', or 'limit'/'allocated' etc.?
 *   5. Does RoomConfig have exactly these four fields, or more (shape, multiple rooms)?
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  ProjectContextValue,
  StylePack,
  BudgetPlan,
  RoomConfig,
} from "@/components/shared/layout/sidebar/types";

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within <ProjectProvider>");
  return ctx;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [stylePack, setStylePack] = useState<StylePack | null>(null);
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);

  return (
    <ProjectContext.Provider
      value={{
        stylePack,
        budgetPlan,
        roomConfig,
        setStylePack,
        setBudgetPlan,
        setRoomConfig,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
