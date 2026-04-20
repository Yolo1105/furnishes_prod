/**
 * Detect user behaviors that indicate extraction quality without explicit thumbs up/down.
 * Signals feed into calibration over time.
 */

export type SignalType =
  | "restate_preference"
  | "preference_removal"
  | "style_change_after_rec";

export interface ImplicitSignal {
  type: SignalType;
  field?: string;
  comment: string;
}

/** Preference-expressing phrases: value must appear in this context to count as restate (avoids "I saw a modern art exhibit"). */
const PREFERENCE_EXPRESSING =
  /\b(want|like|prefer|love|keep|go with|my style is|looking for|into)\b/i;

/**
 * Detect if user is restating something already extracted (suggests they don't trust it was captured).
 * Requires the value to appear in a preference-expressing context (e.g. near "I want", "I like"), not just anywhere.
 */
function detectRestatePreference(
  message: string,
  currentPrefs: Record<string, string>,
): ImplicitSignal | null {
  const lower = message.toLowerCase();
  if (!PREFERENCE_EXPRESSING.test(lower)) return null;
  for (const [field, value] of Object.entries(currentPrefs)) {
    if (!value || value.length < 3) continue;
    const valueLower = value.toLowerCase();
    if (!lower.includes(valueLower)) continue;
    const valueIdx = lower.indexOf(valueLower);
    const before = lower.slice(Math.max(0, valueIdx - 60), valueIdx);
    const after = lower.slice(
      valueIdx + valueLower.length,
      valueIdx + valueLower.length + 40,
    );
    const context = before + " " + after;
    if (PREFERENCE_EXPRESSING.test(context)) {
      return {
        type: "restate_preference",
        field,
        comment: `User restated preference "${value}" for ${field}; may indicate extraction was wrong or not trusted.`,
      };
    }
  }
  return null;
}

/**
 * preference_removal is detected when the frontend sends a reject/remove event (handled in API).
 * Here we only detect from message content, e.g. "actually remove the X" or "forget the X".
 */
function detectPreferenceRemoval(
  message: string,
  currentPrefs: Record<string, string>,
): ImplicitSignal | null {
  const lower = message.toLowerCase();
  if (!/\b(remove|forget|ignore|don't want|dont want|drop|undo)\b/.test(lower))
    return null;
  for (const [field, value] of Object.entries(currentPrefs)) {
    if (!value) continue;
    if (lower.includes(value.toLowerCase())) {
      return {
        type: "preference_removal",
        field,
        comment: `User asked to remove or forget "${value}" for ${field}.`,
      };
    }
  }
  return null;
}

/**
 * If user changes style preference within 2 messages after receiving a recommendation, recommendation may have missed the mark.
 */
function detectStyleChangeAfterRec(
  message: string,
  recentMessages: Array<{ role: string; content: string }>,
): ImplicitSignal | null {
  const styleKeywords = [
    "style",
    "look",
    "modern",
    "scandinavian",
    "traditional",
    "minimal",
    "industrial",
    "boho",
    "scandi",
    "mcm",
  ];
  const hasStyleIntent = styleKeywords.some((k) =>
    message.toLowerCase().includes(k),
  );
  if (!hasStyleIntent) return null;
  const lastTwo = recentMessages.slice(0, 2);
  const lastWasAssistant = lastTwo.some((m) => m.role === "assistant");
  const assistantMentionedRec = lastTwo.some(
    (m) =>
      m.role === "assistant" &&
      /\b(recommend|suggest|option|choice)\b/i.test(m.content),
  );
  if (lastWasAssistant && assistantMentionedRec) {
    return {
      type: "style_change_after_rec",
      field: "style",
      comment:
        "User changed or clarified style shortly after a recommendation; recommendation may have missed the mark.",
    };
  }
  return null;
}

/**
 * Detect implicit feedback signals from message, current preferences, and recent messages.
 */
export function detectImplicitSignals(
  message: string,
  currentPrefs: Record<string, string>,
  recentMessages: Array<{ role: string; content: string }>,
): ImplicitSignal[] {
  const signals: ImplicitSignal[] = [];
  const restate = detectRestatePreference(message, currentPrefs);
  if (restate) signals.push(restate);
  const removal = detectPreferenceRemoval(message, currentPrefs);
  if (removal) signals.push(removal);
  const styleChange = detectStyleChangeAfterRec(message, recentMessages);
  if (styleChange) signals.push(styleChange);
  return signals;
}
