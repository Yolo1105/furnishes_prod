import { VIEW_IDS } from "@/lib/eva-dashboard/core/constants";

/** True when the main dashboard surface is a chat tab (new, provisional recent, or persisted convo). */
export function isChatLikeActiveItem(activeItem: string): boolean {
  return (
    activeItem === VIEW_IDS.NEW_CHAT ||
    activeItem.startsWith("recent-") ||
    activeItem.startsWith("convo-")
  );
}
