"use client";

/**
 * Assistant picker state for the Eva chatbot shell.
 * Design **projects** are `ActiveProjectProvider`; do not mix legacy workspace/project identity here.
 */
import React, { createContext, useContext, useState, useMemo } from "react";
import type { Assistant } from "@/lib/eva-dashboard/types";
import { DEFAULT_ASSISTANT } from "@/lib/eva-dashboard/core/constants";

interface EvaAssistantContextValue {
  selectedAssistant: Assistant;
  showAssistantPicker: boolean;
  setSelectedAssistant: (assistant: Assistant) => void;
  setShowAssistantPicker: (show: boolean) => void;
}

const EvaAssistantContext = createContext<EvaAssistantContextValue | null>(
  null,
);

export function EvaAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedAssistant, setSelectedAssistant] =
    useState<Assistant>(DEFAULT_ASSISTANT);
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);

  const value = useMemo(
    (): EvaAssistantContextValue => ({
      selectedAssistant,
      showAssistantPicker,
      setSelectedAssistant,
      setShowAssistantPicker,
    }),
    [selectedAssistant, showAssistantPicker],
  );

  return (
    <EvaAssistantContext.Provider value={value}>
      {children}
    </EvaAssistantContext.Provider>
  );
}

export function useEvaAssistant(): EvaAssistantContextValue {
  const ctx = useContext(EvaAssistantContext);
  if (!ctx) {
    throw new Error("useEvaAssistant must be used within EvaAssistantProvider");
  }
  return ctx;
}
