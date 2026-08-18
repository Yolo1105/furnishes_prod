import type {
  ChatPreferenceCategory,
  ConfirmedPreferenceDto,
  PreferenceProposalDto,
} from "./preference-types";
import { confidenceLabel } from "./preference-types";

type PreferenceRow = {
  category: string;
  value: string;
  confidence: number;
  source: string;
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  sourceProposalId: string | null;
  updatedAt: Date;
};

type ProposalRow = {
  id: string;
  category: string;
  proposedValue: string;
  previousValue: string | null;
  acceptedValue: string | null;
  confidence: number;
  status: string;
  source: string;
  conversationId: string | null;
  sourceMessageId: string | null;
  displayMessageId: string | null;
  evidenceText: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
};

export function toConfirmedPreferenceDto(
  row: PreferenceRow,
): ConfirmedPreferenceDto {
  return {
    category: row.category as ChatPreferenceCategory,
    value: row.value,
    confidence: row.confidence,
    source: row.source,
    sourceConversationId: row.sourceConversationId,
    sourceMessageId: row.sourceMessageId,
    sourceProposalId: row.sourceProposalId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPreferenceProposalDto(
  row: ProposalRow,
): PreferenceProposalDto {
  return {
    id: row.id,
    category: row.category as ChatPreferenceCategory,
    proposedValue: row.proposedValue,
    previousValue: row.previousValue,
    acceptedValue: row.acceptedValue,
    confidence: row.confidence,
    confidenceLabel: confidenceLabel(row.confidence),
    status: row.status as PreferenceProposalDto["status"],
    source: row.source,
    sourceConversationId: row.conversationId,
    sourceMessageId: row.sourceMessageId,
    displayMessageId: row.displayMessageId,
    evidenceText: row.evidenceText,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}
