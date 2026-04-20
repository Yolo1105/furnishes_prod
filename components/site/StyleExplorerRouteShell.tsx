import type { ReactNode } from "react";
import "@/components/site/style-explorer.css";
import { styleExplorerMono } from "@/lib/style-explorer-font";

/**
 * Shared chrome for `/style`, `/quiz`, and `/budget` (Space Mono + style-explorer CSS).
 * Each route layout keeps its own `metadata` export and wraps children with this shell.
 */
export function StyleExplorerRouteShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${styleExplorerMono.variable} style-explorer-root min-h-[100dvh] font-mono antialiased`}
      style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
    >
      {children}
    </div>
  );
}
