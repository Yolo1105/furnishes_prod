"use client";

import React, { createContext, useContext, useState } from "react";

interface CurrentConversationContextValue {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
}

const CurrentConversationContext =
  createContext<CurrentConversationContextValue | null>(null);

export function CurrentConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  return (
    <CurrentConversationContext.Provider
      value={{ conversationId, setConversationId }}
    >
      {children}
    </CurrentConversationContext.Provider>
  );
}

export function useCurrentConversation() {
  const ctx = useContext(CurrentConversationContext);
  return ctx ?? { conversationId: null, setConversationId: () => {} };
}
