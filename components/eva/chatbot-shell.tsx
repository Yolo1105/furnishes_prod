"use client";

import type { ReactNode } from "react";
import { EvaToaster } from "@/components/eva/eva-toaster";

/**
 * Eva chatbot viewport: Manrope + light tokens via `.eva-dashboard-root` / `eva-dashboard-theme.css`.
 * We intentionally avoid `next-themes` here: its ThemeProvider injects a `<script>` that React 19
 * rejects during client render ("Encountered a script tag while rendering…").
 */
export function ChatbotShell({
  children,
  fontClassName,
}: {
  children: ReactNode;
  fontClassName: string;
}) {
  return (
    <div className={`${fontClassName} antialiased`}>
      {children}
      <EvaToaster />
    </div>
  );
}
