export type ChatPreferenceCategory =
  "room" | "budget" | "style" | "color" | "furniture";

type PreferenceConfidenceLabel = "high" | "medium" | "low";

type PreferenceProposalStatus =
  "pending" | "accepted" | "rejected" | "reverted";

export type ChatMessageSource =
  "typed" | "room_starter" | "quick_suggestion" | "brainstorm";

export type ExtractedPreferenceCandidate = {
  category: ChatPreferenceCategory;
  value: string;
  confidence: number;
  evidenceText?: string;
  evidenceStart?: number;
  evidenceEnd?: number;
};

export type ConfirmedPreferenceDto = {
  category: ChatPreferenceCategory;
  value: string;
  confidence: number;
  source: string;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  sourceProposalId: string | null;
  updatedAt: string;
};

export type PreferenceProposalDto = {
  id: string;
  category: ChatPreferenceCategory;
  proposedValue: string;
  previousValue: string | null;
  acceptedValue: string | null;
  confidence: number;
  confidenceLabel: PreferenceConfidenceLabel;
  status: PreferenceProposalStatus;
  /** chat | quiz */
  source: string;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  displayMessageId: string | null;
  evidenceText: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export const CHAT_PREFERENCE_CATEGORIES: ChatPreferenceCategory[] = [
  "room",
  "budget",
  "style",
  "color",
  "furniture",
];

export const CHAT_MESSAGE_SOURCES: ChatMessageSource[] = [
  "typed",
  "room_starter",
  "quick_suggestion",
  "brainstorm",
];

export function isChatPreferenceCategory(
  value: string,
): value is ChatPreferenceCategory {
  return (CHAT_PREFERENCE_CATEGORIES as string[]).includes(value);
}

export function isChatMessageSource(value: string): value is ChatMessageSource {
  return (CHAT_MESSAGE_SOURCES as string[]).includes(value);
}

export function confidenceLabel(confidence: number): PreferenceConfidenceLabel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

export function emptyPreferenceMap(): Record<
  ChatPreferenceCategory,
  string | null
> {
  return {
    room: null,
    budget: null,
    style: null,
    color: null,
    furniture: null,
  };
}

export function preferenceMapFromDetails(
  details: Array<{ category: string; value: string }>,
): Record<ChatPreferenceCategory, string | null> {
  return details.reduce((acc, p) => {
    if (isChatPreferenceCategory(p.category)) acc[p.category] = p.value;
    return acc;
  }, emptyPreferenceMap());
}
