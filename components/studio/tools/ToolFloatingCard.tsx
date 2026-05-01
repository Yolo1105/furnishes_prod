"use client";

import { useStore } from "@studio/store";
import { ReferenceCard } from "./ReferenceCard";
import { InventoryCard } from "./InventoryCard";
import { ChatHistoryCard } from "./ChatHistoryCard";
import { GenerationsCard } from "./GenerationsCard";
import { StarredCard } from "./StarredCard";
import { RoomGridCard } from "./RoomGridCard";
import { ToolCardErrorBoundary } from "./ToolCardErrorBoundary";

/**
 * Dispatcher: mounts one floating card per tool currently in
 * `openTools` *that uses the floating-card pattern*. Each card is
 * wrapped in a ToolCardErrorBoundary so a crash in one card surfaces
 * a recoverable inline message instead of taking down the whole
 * studio.
 *
 * Catalog is intentionally excluded — it's a transactional modal
 * mounted at the Studio level (`<CatalogModal />`) rather than a
 * floating side card. Its tile in the Tools card still toggles via
 * `openTools.includes("catalog")`, so the active-orange state works
 * the same way; only the surface shape differs.
 *
 * Health was removed in v0.40.4 along with the Planner workspace —
 * Health was a stub that never graduated to a real implementation.
 *
 * Multiple cards may be open simultaneously. Each owns a stable
 * `tool-<n>` id for its drag-position store.
 */
export function ToolFloatingCards() {
  const openTools = useStore((s) => s.openTools);

  return (
    <>
      {openTools.map((tool) => {
        switch (tool) {
          case "reference":
            return (
              <ToolCardErrorBoundary key={tool} cardName="Reference">
                <ReferenceCard />
              </ToolCardErrorBoundary>
            );
          case "inventory":
            return (
              <ToolCardErrorBoundary key={tool} cardName="Inventory">
                <InventoryCard />
              </ToolCardErrorBoundary>
            );
          case "generations":
            return (
              <ToolCardErrorBoundary key={tool} cardName="Generations">
                <GenerationsCard />
              </ToolCardErrorBoundary>
            );
          case "chat-history":
            return (
              <ToolCardErrorBoundary key={tool} cardName="Chat history">
                <ChatHistoryCard />
              </ToolCardErrorBoundary>
            );
          case "starred":
            return (
              <ToolCardErrorBoundary key={tool} cardName="Starred">
                <StarredCard />
              </ToolCardErrorBoundary>
            );
          case "room-grid":
            return (
              <ToolCardErrorBoundary key={tool} cardName="Room grid">
                <RoomGridCard />
              </ToolCardErrorBoundary>
            );
          case "catalog":
            // Handled by `<CatalogModal />` mounted at the Studio level.
            return null;
        }
        // Exhaustiveness check — TypeScript narrows `tool` to never
        // here; if a new tool is added we get a build error until
        // the switch covers it.
        const _exhaustive: never = tool;
        return _exhaustive;
      })}
    </>
  );
}
