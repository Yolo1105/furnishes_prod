"use client";

import type { ReactNode } from "react";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { StudioEvaChatPanel } from "@/components/eva-dashboard/account/studio-eva-chat-panel";

/**
 * Image Gen workspace shell: matches `/chatbot` layout — `w-64` prompt rail | flex-1 inspect | `w-64` Eva.
 * Parallels `AccountShell`+children for Studio hub and `DashboardLayout` for Chat.
 */
export function ImageGenPageLayout({
  leftPanel,
  centerPanel,
}: {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
}) {
  return (
    <AccountShell
      rightPanel={<StudioEvaChatPanel />}
      splitMain={{ left: leftPanel, center: centerPanel }}
    />
  );
}
