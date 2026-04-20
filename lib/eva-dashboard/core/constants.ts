import type { Assistant, ViewId } from "@/lib/eva-dashboard/types";
import {
  assistantSummaryForClient,
  getAssistantById,
  DEFAULT_ASSISTANT_ID,
} from "@/lib/eva/assistants/catalog";

// Navigation
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

// Timing
export const TYPING_SPEED_MS = 90;
/** Abort /api/chat if the stream does not finish (avoids infinite typing dots). */
export const CHAT_STREAM_TIMEOUT_MS = 120_000;
/**
 * Client-side smoothing for streamed assistant text — reveals toward the real accumulated
 * string so large provider chunks do not appear as a single instant jump.
 */
export const CHAT_STREAM_REVEAL_CHARS_PER_SEC = 88;
/** Caps how many characters one frame may add (tab background / long frames). */
export const CHAT_STREAM_REVEAL_MAX_CHARS_PER_FRAME = 28;
/** Assumed elapsed ms for the first reveal frame (avoids oversized dt when lastTs is unset). */
export const CHAT_STREAM_REVEAL_FIRST_FRAME_MS = 16;
/** Max ms between frames used for reveal rate (caps catch-up after tab background). */
export const CHAT_STREAM_REVEAL_MAX_FRAME_DELTA_MS = 64;
/** Safety cap for await loop syncing shown text to final flushed content (not user-visible). */
export const CHAT_STREAM_REVEAL_AWAIT_MAX_STEPS = 120_000;
/** Max height for the chat composer textarea (px) before scrolling inside the field. */
export const CHAT_COMPOSER_MAX_HEIGHT_PX = 200;
export { MOBILE_BREAKPOINT } from "@/lib/utils";

// Defaults (real design projects use `ActiveProjectProvider`, not mock workspace IDs.)
export const DEFAULT_ASSISTANT: Assistant = assistantSummaryForClient(
  getAssistantById(DEFAULT_ASSISTANT_ID),
);

/** Default room label for inline “new project” in the chatbot shell. */
export const DEFAULT_NEW_PROJECT_ROOM_LABEL = "Living room";
