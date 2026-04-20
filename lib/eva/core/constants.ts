import type { ViewId } from "@/lib/eva/types";
import {
  assistantSummaryForClient,
  getAssistantById,
  DEFAULT_ASSISTANT_ID,
} from "@/lib/eva/assistants/catalog";

export const VIEW_IDS: Record<string, ViewId> = {
  NEW_CHAT: "new-chat",
  SEARCH: "search",
  WORKSPACE: "workspace",
  FILES: "files",
  DISCOVER: "discover",
  PLAYBOOK: "playbook",
  CART: "cart",
  SETTINGS: "settings",
  COMMUNITY: "community",
  CUSTOMIZE: "customize",
  LANDING: "landing",
} as const;

export const TYPING_SPEED_MS = 90;
export const AI_RESPONSE_DELAY_MS = 400;
export { MOBILE_BREAKPOINT } from "@/lib/utils";

/** Same assistant default as the Eva dashboard; sourced from `lib/eva/assistants/catalog`. */
export const DEFAULT_ASSISTANT = assistantSummaryForClient(
  getAssistantById(DEFAULT_ASSISTANT_ID),
);
