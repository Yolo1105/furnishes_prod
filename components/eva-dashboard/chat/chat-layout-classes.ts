/**
 * Dashboard chat surface — shared layout tokens so scroll padding, composer, and
 * readable widths stay consistent (single source; avoids duplicate arbitrary rem values).
 */
export const CHAT_MAIN_SCROLL_CLASS = "px-4 py-4 sm:px-6 sm:py-6" as const;

/** Horizontal padding only — match {@link CHAT_MAIN_SCROLL_CLASS} for composer/footer alignment. */
export const CHAT_MAIN_GUTTER_X_CLASS = "px-4 sm:px-6" as const;

/** Intro / secondary assistant lines (welcome copy, “stopped” note): same readable measure. */
export const CHAT_READABLE_BODY_MAX_CLASS = "max-w-[min(100%,52rem)]" as const;

/** Assistant bubble: wide column with a comfortable line-length cap (~52rem). */
export const CHAT_ASSISTANT_BUBBLE_MAX_CLASS =
  "max-w-[min(92%,52rem)]" as const;
