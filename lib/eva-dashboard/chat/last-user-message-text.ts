import type { ChatMessage } from "@/lib/eva-dashboard/types";

/** Most recent user message text (for light follow-up routing in compact rails). */
export function getLatestUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}
