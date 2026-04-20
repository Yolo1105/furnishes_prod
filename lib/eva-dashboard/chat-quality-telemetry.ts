"use client";

import { API_ROUTES } from "@/lib/eva-dashboard/api";

export type ChatQualityEventName =
  | "chat_stream_started"
  | "chat_first_token_visible"
  | "chat_stream_completed"
  | "chat_stream_failed"
  | "chat_stream_stopped_by_user"
  | "chat_retry_clicked"
  | "chat_starter_card_sent"
  | "chat_suggestion_chip_sent"
  | "chat_user_follow_up_after_assistant"
  | "chat_review_prompt_shown"
  | "chat_review_prompt_dismissed"
  | "chat_review_prompt_opened_preferences"
  | "chat_proposal_confirmed"
  | "chat_proposal_rejected"
  | "chat_extraction_confirmed_inline";

/**
 * Best-effort chat UX instrumentation (server logs; no third-party analytics).
 * Safe to call frequently — failures are swallowed.
 */
export function reportChatQualityEvent(
  name: ChatQualityEventName,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  void fetch(API_ROUTES.chatQuality, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ts: Date.now(), ...payload }),
  }).catch(() => {});
}
