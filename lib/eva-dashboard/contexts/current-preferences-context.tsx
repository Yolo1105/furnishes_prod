"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";

interface PrefItem {
  field: string;
  value: string;
  source?: string | null;
}

interface CurrentPreferencesContextValue {
  preferences: Record<string, string>;
  setPreferences: (p: Record<string, string>) => void;
  sourcesByField: Record<string, string | null>;
  refreshPreferences: (conversationId: string) => Promise<void>;
}

const CurrentPreferencesContext =
  createContext<CurrentPreferencesContextValue | null>(null);

export function CurrentPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<Record<string, string>>({});
  const [sourcesByField, setSourcesByField] = useState<
    Record<string, string | null>
  >({});

  const refreshPreferences = useCallback(async (conversationId: string) => {
    const prefs = await apiGet<PrefItem[]>(
      API_ROUTES.conversationPreferences(conversationId),
    );
    const map: Record<string, string> = {};
    const sources: Record<string, string | null> = {};
    prefs.forEach((p) => {
      map[p.field] = p.value;
      sources[p.field] = p.source ?? null;
    });
    setPreferences(map);
    setSourcesByField(sources);
  }, []);

  return (
    <CurrentPreferencesContext.Provider
      value={{
        preferences,
        setPreferences,
        sourcesByField,
        refreshPreferences,
      }}
    >
      {children}
    </CurrentPreferencesContext.Provider>
  );
}

export function useCurrentPreferences() {
  const ctx = useContext(CurrentPreferencesContext);
  return (
    ctx ?? {
      preferences: {},
      setPreferences: () => {},
      sourcesByField: {},
      refreshPreferences: async () => {},
    }
  );
}
