import type { ChatPreferenceCategory } from "@/server/preferences/preference-types";

export type {
  ChatPreferenceCategory,
  ConfirmedPreferenceDto,
  PreferenceProposalDto,
} from "@/server/preferences/preference-types";

export type PreferenceSourceDto = {
  category: ChatPreferenceCategory;
  proposedValue: string;
  acceptedValue: string | null;
  confidence: number;
  source: string;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  sourceMessageContent: string | null;
  sourceMessageTimestamp: string | null;
  sourceMessageRole: string | null;
};
