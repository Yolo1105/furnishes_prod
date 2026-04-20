/**
 * Message intent classifier for routing extraction. Ported from V1 classifier.py.
 * Used to skip LLM extraction for EXPLORATORY/QUESTION when no preference content.
 */

import {
  countDistinctColorTokens,
  hasExplicitPreferenceLanguage,
  looksLikeStyleOrAestheticStatement,
  messageLooksLikeExploratoryTopicLabel,
} from "@/lib/eva/extraction/topic-labels";

export enum MessageIntent {
  DIRECT_PREFERENCE = "direct_preference",
  INDIRECT_PREFERENCE = "indirect_preference",
  NEGATION = "negation",
  UPDATE = "update",
  RETRACTION = "retraction",
  QUESTION = "question",
  CLARIFICATION_RESPONSE = "clarification_response",
  UNCERTAIN = "uncertain",
  EXPLORATORY = "exploratory",
}

export type ClassifyResult = { intent: MessageIntent; confidence: number };

const CLARIFICATION_PATTERNS = [
  /\b(?:yes|yeah|yep|sure|ok|okay|correct|right|that'?s\s+it|exactly)\b/,
  /\b(?:no|nope|not\s+really|wrong|incorrect|that'?s\s+not\s+right)\b/,
];

const RETRACTION_PATTERNS = [
  /\b(?:forget|ignore|disregard|never\s+mind|scratch)\s+(?:about\s+)?(?:that|it|the)/,
  /\b(?:actually|wait|hold\s+on)\s+(?:forget|ignore|no|not)/,
];

const UPDATE_PATTERNS = [
  /\b(?:actually|wait|correction|change|update)\s+/,
  /\b(?:changed|change)\s+my\s+mind/,
  /\b(?:not|no\s+longer)\s+[a-z]+\s+(?:anymore|now)\s+(?:but|instead)/,
];

const NEGATION_PATTERNS = [
  /\b(?:not|no|nothing|avoid|skip|exclude|don'?t\s+want)\s+/,
  /\b(?:i'?m|i\s+am|we'?re|we\s+are)\s+(?:so\s+)?(?:over|done\s+with)/,
];

const UNCERTAIN_PATTERNS = [
  /\bmaybe\b/,
  /\b(?:possibly|perhaps|might|could)\s+be/,
  /\b(?:i'?m|i\s+am)\s+thinking\s+(?:about\s+)?/,
  /\b(?:i'?m|i\s+am)\s+considering/,
  /\b(?:not|no)\s+sure\s+(?:but|if)/,
  /\bwhat\s+about\b/,
];

const EXPLORATORY_PATTERNS = [
  /\b(?:i\s+)?(?:don'?t|do\s+not)\s+know\b/,
  /\b(?:what|how|which)\s+do\s+you\s+(?:think|recommend|suggest)/,
  /\b(?:show|give)\s+me\s+(?:options|ideas|suggestions)/,
  /\b(?:i'?m|i\s+am)\s+(?:open|flexible)\s+to/,
];

const QUESTION_PATTERNS = [
  /\?$/,
  /\b(?:what|which|how|when|where|why|can|could|should|would)\s+/,
  /\bis\s+it\s+(?:possible|ok|good)/,
];

const PREFERENCE_KEYWORDS = [
  "room",
  "style",
  "color",
  "budget",
  "furniture",
  "modern",
  "traditional",
  "minimalist",
  "scandinavian",
  "blue",
  "green",
  "sofa",
  "bed",
  "table",
  "bedroom",
  "living room",
  "kitchen",
  "bathroom",
];

const INDIRECT_PATTERNS = [
  /\b(?:want|need|looking\s+for)\s+(?:it|the\s+room|the\s+space)\s+to\s+(?:feel|be|look)/,
  /\b(?:want|need|looking\s+for)\s+(?:something|a\s+space)\s+that\s+(?:feels|is|looks)/,
  /\b(?:like|similar\s+to|inspired\s+by)\s+/,
];

/**
 * Classify message intent. Optional chatHistory for clarification context (recent messages).
 */
export function classifyMessageIntent(
  message: string,
  _chatHistory?: Array<{ role: string; content?: string }>,
): ClassifyResult {
  const lower = message.toLowerCase().trim();

  for (const pat of CLARIFICATION_PATTERNS) {
    if (pat.test(lower)) {
      if (_chatHistory?.length) {
        const lastAssistant = [..._chatHistory]
          .reverse()
          .find((m) => m.role === "assistant");
        const content = (lastAssistant?.content ?? "").toLowerCase();
        if (content.includes("clarification") || content.includes("?"))
          return {
            intent: MessageIntent.CLARIFICATION_RESPONSE,
            confidence: 0.9,
          };
      }
    }
  }

  for (const pat of RETRACTION_PATTERNS)
    if (pat.test(lower))
      return { intent: MessageIntent.RETRACTION, confidence: 0.9 };
  for (const pat of UPDATE_PATTERNS)
    if (pat.test(lower))
      return { intent: MessageIntent.UPDATE, confidence: 0.85 };
  for (const pat of NEGATION_PATTERNS)
    if (pat.test(lower))
      return { intent: MessageIntent.NEGATION, confidence: 0.8 };
  for (const pat of UNCERTAIN_PATTERNS)
    if (pat.test(lower))
      return { intent: MessageIntent.UNCERTAIN, confidence: 0.75 };
  for (const pat of EXPLORATORY_PATTERNS)
    if (pat.test(lower))
      return { intent: MessageIntent.EXPLORATORY, confidence: 0.9 };

  if (messageLooksLikeExploratoryTopicLabel(lower))
    return { intent: MessageIntent.EXPLORATORY, confidence: 0.92 };

  const isQuestion = QUESTION_PATTERNS.some((p) => p.test(lower));
  if (isQuestion) {
    if (
      hasExplicitPreferenceLanguage(lower) ||
      looksLikeStyleOrAestheticStatement(lower)
    )
      return { intent: MessageIntent.DIRECT_PREFERENCE, confidence: 0.72 };
    return { intent: MessageIntent.QUESTION, confidence: 0.78 };
  }

  for (const pat of INDIRECT_PATTERNS)
    if (pat.test(lower))
      return { intent: MessageIntent.INDIRECT_PREFERENCE, confidence: 0.75 };

  const hasKeywords = PREFERENCE_KEYWORDS.some((k) => lower.includes(k));
  if (hasKeywords) {
    if (hasExplicitPreferenceLanguage(lower))
      return { intent: MessageIntent.DIRECT_PREFERENCE, confidence: 0.78 };
    if (looksLikeStyleOrAestheticStatement(lower))
      return { intent: MessageIntent.DIRECT_PREFERENCE, confidence: 0.78 };
    if (countDistinctColorTokens(lower) >= 2)
      return { intent: MessageIntent.DIRECT_PREFERENCE, confidence: 0.76 };
    const wordCount = lower.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 6)
      return { intent: MessageIntent.EXPLORATORY, confidence: 0.72 };
    return { intent: MessageIntent.DIRECT_PREFERENCE, confidence: 0.68 };
  }
  if (lower.split(/\s+/).filter(Boolean).length <= 2)
    return { intent: MessageIntent.EXPLORATORY, confidence: 0.6 };
  return { intent: MessageIntent.DIRECT_PREFERENCE, confidence: 0.5 };
}

/** Intents for which we skip LLM extraction (no preference to extract). */
export const SKIP_EXTRACTION_INTENTS: MessageIntent[] = [
  MessageIntent.EXPLORATORY,
  MessageIntent.QUESTION, // pure questions e.g. "What colors work with beige?" don't state preferences
];

/** Return true if we should skip the LLM extraction call for this intent. */
export function shouldSkipExtraction(intent: MessageIntent): boolean {
  return SKIP_EXTRACTION_INTENTS.includes(intent);
}
