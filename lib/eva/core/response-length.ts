/**
 * Adaptive response length hints for system prompt augmentation.
 */

const GREETING_PATTERNS =
  /^(hi|hello|hey|howdy|good morning|good afternoon|good evening|hi there|hey there)[\s!.,?]*$/i;
const BREVITY_PATTERNS =
  /\b(just|quick|quickly|brief|short|tl;dr|in short|summarize|summary)\b/i;
const RECOMMENDATION_PATTERNS =
  /\b(recommend|suggestion|suggest|what (should i|can i)|which|options?|ideas?|plan|detail|detailed|explain|tell me more|how do i)\b/i;
const YES_NO_PATTERNS = /\b(yes|no|yeah|nope|sure|ok|okay|maybe)\s*[.?!]*$/i;

export function getResponseLengthInstruction(message: string): string {
  const trimmed = message.trim();
  if (GREETING_PATTERNS.test(trimmed)) {
    return "Respond in 1-2 short sentences.";
  }
  if (BREVITY_PATTERNS.test(trimmed)) {
    return "Respond in 1-2 short sentences.";
  }
  if (YES_NO_PATTERNS.test(trimmed) && trimmed.length < 30) {
    return "Respond in 1-2 short sentences.";
  }
  if (RECOMMENDATION_PATTERNS.test(trimmed)) {
    return "Give enough to compare options clearly, but stay conversational—short contrasts and plain language, not a formal report, unless they ask for depth.";
  }
  if (/\?$/.test(trimmed)) {
    return "Answer the question directly first; use at most one follow-up question if you need missing context.";
  }
  return "Prefer 1–2 short paragraphs; add bullets only when comparing options or when they ask for a list.";
}
