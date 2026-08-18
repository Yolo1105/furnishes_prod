/**
 * Message intent for preference extraction. Skip exploratory/questions
 * unless the message also carries an explicit preference cue.
 */

type PreferenceMessageIntent =
  | "preference"
  | "question"
  | "exploratory"
  | "negation"
  | "uncertain"
  | "other";

const EXPLICIT_PREFERENCE_CUE =
  /\b(?:i|we)(?:'d|\s+would|\s+will)?\s+(?:like|love|want|need|prefer|hate|avoid)\b/i;
const EXPLICIT_PREFERENCE_CUE2 =
  /\b(?:my|our)\s+(?:budget|style|palette|room|space|goal|priority|preference)\b/i;
const NAMED_STYLE =
  /\b(?:scandinavian|industrial|minimalist|japandi|mid[- ]century|coastal|farmhouse|boho|bohemian|traditional|modern|contemporary|rustic|mediterranean|art\s+deco|wabi[- ]sabi|maximalist)\b/i;

const EXPLORATORY =
  /\b(?:i\s+)?(?:don'?t|do\s+not)\s+know\b|\b(?:what|how|which)\s+do\s+you\s+(?:think|recommend|suggest)\b|\b(?:show|give)\s+me\s+(?:options|ideas|suggestions)\b|\b(?:i'?m|i\s+am)\s+(?:open|flexible)\s+to\b/i;

const QUESTION_START =
  /\b(?:what|which|how|when|where|why|can|could|should|would)\s+/i;

const NEGATION =
  /\b(?:not|no|nothing|avoid|skip|exclude|don'?t\s+want|do\s+not\s+want)\b|\b(?:i'?m|i\s+am|we'?re|we\s+are)\s+(?:so\s+)?(?:over|done\s+with)\b/i;

const UNCERTAIN =
  /\bmaybe\b|\b(?:possibly|perhaps|might|could)\s+be\b|\b(?:i'?m|i\s+am)\s+thinking\s+(?:about\s+)?|\b(?:i'?m|i\s+am)\s+considering\b|\bwhat\s+about\b/i;

function hasExplicitPreferenceLanguage(message: string): boolean {
  return (
    EXPLICIT_PREFERENCE_CUE.test(message) ||
    EXPLICIT_PREFERENCE_CUE2.test(message) ||
    NAMED_STYLE.test(message)
  );
}

export function classifyPreferenceMessageIntent(
  message: string,
): PreferenceMessageIntent {
  const text = message.trim();
  if (!text) return "other";

  if (NEGATION.test(text) && !hasExplicitPreferenceLanguage(text)) {
    // Pure / dominant negation without a positive preference statement.
    const positiveWant =
      /\b(?:i|we)\s+(?:still\s+)?(?:like|love|want|need|prefer)\b/i.test(text);
    if (!positiveWant) return "negation";
  }

  if (EXPLORATORY.test(text) && !hasExplicitPreferenceLanguage(text)) {
    return "exploratory";
  }

  if (
    (text.endsWith("?") || QUESTION_START.test(text)) &&
    !hasExplicitPreferenceLanguage(text)
  ) {
    return "question";
  }

  if (UNCERTAIN.test(text) && !EXPLICIT_PREFERENCE_CUE.test(text)) {
    return "uncertain";
  }

  if (hasExplicitPreferenceLanguage(text) || NAMED_STYLE.test(text)) {
    return "preference";
  }

  return "other";
}

export function shouldSkipPreferenceExtraction(
  intent: PreferenceMessageIntent,
): boolean {
  return intent === "exploratory" || intent === "question";
}
