import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  getPreferenceExtractionProvider,
  maxProposalsPerMessage,
  minExtractionConfidence,
} from "./preference-extraction-factory";
import { hardenExtractedPreferenceCandidates } from "./preference-hardening";
import { normalizePreferenceValue } from "./preference-normalization";
import {
  toConfirmedPreferenceDto,
  toPreferenceProposalDto,
} from "./preference-repository";
import { preferenceValueSchema } from "./preference-schema";
import type {
  ChatMessageSource,
  ChatPreferenceCategory,
  ConfirmedPreferenceDto,
  ExtractedPreferenceCandidate,
  PreferenceProposalDto,
} from "./preference-types";
import {
  emptyPreferenceMap,
  isChatPreferenceCategory,
} from "./preference-types";

async function requireMemoryEnabled(
  userId: string,
): Promise<ServiceResult<{ memoryEnabled: true }, "forbidden" | "not_found">> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { memoryEnabled: true },
  });
  if (!user) return err("not_found", "User not found.");
  if (!user.memoryEnabled) {
    return err(
      "forbidden",
      "Memory is disabled. Enable Eva memory in Privacy to save preferences.",
    );
  }
  return ok({ memoryEnabled: true });
}

export async function listConfirmedPreferences(
  userId: string,
): Promise<ConfirmedPreferenceDto[]> {
  const rows = await prisma.userPreference.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toConfirmedPreferenceDto);
}

export async function getConfirmedPreferenceMap(
  userId: string,
): Promise<Record<ChatPreferenceCategory, string | null>> {
  const state = await getConfirmedPreferenceState(userId);
  return state.values;
}

export async function getConfirmedPreferenceState(userId: string): Promise<{
  values: Record<ChatPreferenceCategory, string | null>;
  sources: Partial<Record<ChatPreferenceCategory, string>>;
}> {
  const rows = await prisma.userPreference.findMany({
    where: { userId },
    select: { category: true, value: true, source: true },
  });
  const values = emptyPreferenceMap();
  const sources: Partial<Record<ChatPreferenceCategory, string>> = {};
  for (const row of rows) {
    if (!isChatPreferenceCategory(row.category)) continue;
    values[row.category] = row.value;
    sources[row.category] = row.source;
  }
  return { values, sources };
}

export async function setManualPreference(input: {
  userId: string;
  category: ChatPreferenceCategory;
  value: string;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
}): Promise<
  ServiceResult<
    ConfirmedPreferenceDto,
    "validation" | "forbidden" | "not_found"
  >
> {
  const memory = await requireMemoryEnabled(input.userId);
  if (!memory.ok) return memory;

  const parsed = preferenceValueSchema.safeParse(input.value);
  if (!parsed.success) {
    return err("validation", "Invalid preference value.", {
      value: parsed.error.issues[0]?.message ?? "Invalid value.",
    });
  }

  const normalized = normalizePreferenceValue(input.category, parsed.data);
  if (!normalized) {
    return err("validation", "Preference value is too generic.", {
      value: "Choose a more specific preference.",
    });
  }

  const row = await prisma.userPreference.upsert({
    where: {
      userId_category: {
        userId: input.userId,
        category: input.category,
      },
    },
    create: {
      userId: input.userId,
      category: input.category,
      value: normalized,
      confidence: 1,
      source: "manual_chat",
      sourceConversationId: input.sourceConversationId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      sourceProposalId: null,
    },
    update: {
      value: normalized,
      confidence: 1,
      source: "manual_chat",
      sourceConversationId: input.sourceConversationId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      sourceProposalId: null,
    },
  });

  return ok(toConfirmedPreferenceDto(row));
}

export async function removeManualPreference(
  userId: string,
  category: ChatPreferenceCategory,
): Promise<ServiceResult<{ removed: true }, "forbidden" | "not_found">> {
  const memory = await requireMemoryEnabled(userId);
  if (!memory.ok) return memory;

  await prisma.userPreference.deleteMany({
    where: { userId, category },
  });
  return ok({ removed: true });
}

export async function listPendingPreferenceProposals(input: {
  userId: string;
  conversationId?: string;
  cursor?: string;
  take?: number;
}): Promise<PreferenceProposalDto[]> {
  const take = Math.min(Math.max(input.take ?? 40, 1), 100);
  const rows = await prisma.preferenceProposal.findMany({
    where: {
      userId: input.userId,
      status: "pending",
      ...(input.conversationId
        ? {
            OR: [
              { conversationId: input.conversationId },
              { source: "quiz", conversationId: null },
            ],
          }
        : {}),
      ...(input.cursor ? { id: { lt: input.cursor } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  return rows.map(toPreferenceProposalDto);
}

export async function acceptPreferenceProposal(input: {
  userId: string;
  proposalId: string;
  value?: string;
}): Promise<
  ServiceResult<
    {
      proposal: PreferenceProposalDto;
      preference: ConfirmedPreferenceDto;
    },
    "not_found" | "validation" | "forbidden" | "already_complete"
  >
> {
  const memory = await requireMemoryEnabled(input.userId);
  if (!memory.ok) return memory;

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.preferenceProposal.findFirst({
      where: { id: input.proposalId, userId: input.userId },
    });
    if (!proposal) return err("not_found", "Proposal not found.");
    if (proposal.status !== "pending") {
      return err("already_complete", "Proposal is already resolved.");
    }
    if (!isChatPreferenceCategory(proposal.category)) {
      return err("validation", "Invalid proposal category.");
    }

    const rawValue = input.value?.trim() || proposal.proposedValue;
    const parsed = preferenceValueSchema.safeParse(rawValue);
    if (!parsed.success) {
      return err("validation", "Invalid preference value.", {
        value: parsed.error.issues[0]?.message ?? "Invalid value.",
      });
    }
    const finalValue = normalizePreferenceValue(proposal.category, parsed.data);
    if (!finalValue) {
      return err("validation", "Preference value is too generic.", {
        value: "Choose a more specific preference.",
      });
    }

    const existing = await tx.userPreference.findUnique({
      where: {
        userId_category: {
          userId: input.userId,
          category: proposal.category,
        },
      },
    });

    const preference = await tx.userPreference.upsert({
      where: {
        userId_category: {
          userId: input.userId,
          category: proposal.category,
        },
      },
      create: {
        userId: input.userId,
        category: proposal.category,
        value: finalValue,
        confidence: proposal.confidence,
        source: proposal.source === "quiz" ? "quiz" : "extracted_confirmed",
        sourceConversationId: proposal.conversationId,
        sourceMessageId: proposal.sourceMessageId,
        sourceProposalId: proposal.id,
      },
      update: {
        value: finalValue,
        confidence: proposal.confidence,
        source: proposal.source === "quiz" ? "quiz" : "extracted_confirmed",
        sourceConversationId: proposal.conversationId,
        sourceMessageId: proposal.sourceMessageId,
        sourceProposalId: proposal.id,
      },
    });

    const updated = await tx.preferenceProposal.update({
      where: { id: proposal.id },
      data: {
        status: "accepted",
        previousValue: existing?.value ?? proposal.previousValue,
        acceptedValue: finalValue,
        resolvedAt: new Date(),
      },
    });

    return ok({
      proposal: toPreferenceProposalDto(updated),
      preference: toConfirmedPreferenceDto(preference),
    });
  });
}

export async function rejectPreferenceProposal(input: {
  userId: string;
  proposalId: string;
}): Promise<
  ServiceResult<
    PreferenceProposalDto,
    "not_found" | "already_complete" | "forbidden"
  >
> {
  const memory = await requireMemoryEnabled(input.userId);
  if (!memory.ok) return memory;

  const proposal = await prisma.preferenceProposal.findFirst({
    where: { id: input.proposalId, userId: input.userId },
  });
  if (!proposal) return err("not_found", "Proposal not found.");
  if (proposal.status !== "pending") {
    return err("already_complete", "Proposal is already resolved.");
  }

  const updated = await prisma.preferenceProposal.update({
    where: { id: proposal.id },
    data: {
      status: "rejected",
      resolvedAt: new Date(),
    },
  });
  return ok(toPreferenceProposalDto(updated));
}

export async function undoAcceptedPreferenceProposal(input: {
  userId: string;
  proposalId: string;
}): Promise<
  ServiceResult<
    {
      proposal: PreferenceProposalDto;
      preference: ConfirmedPreferenceDto | null;
    },
    "not_found" | "forbidden" | "already_complete" | "conflict"
  >
> {
  const memory = await requireMemoryEnabled(input.userId);
  if (!memory.ok) return memory;

  return prisma.$transaction(async (tx) => {
    const proposal = await tx.preferenceProposal.findFirst({
      where: { id: input.proposalId, userId: input.userId },
    });
    if (!proposal) return err("not_found", "Proposal not found.");
    if (proposal.status !== "accepted") {
      return err("already_complete", "Only accepted proposals can be undone.");
    }

    const current = await tx.userPreference.findFirst({
      where: {
        userId: input.userId,
        category: proposal.category,
      },
    });

    if (!current || current.sourceProposalId !== proposal.id) {
      return err(
        "conflict",
        "A newer preference change prevents undo for this proposal.",
      );
    }

    let preference: ConfirmedPreferenceDto | null = null;
    if (proposal.previousValue) {
      const restored = await tx.userPreference.update({
        where: { id: current.id },
        data: {
          value: proposal.previousValue,
          confidence: 1,
          source: "manual_chat",
          sourceProposalId: null,
        },
      });
      preference = toConfirmedPreferenceDto(restored);
    } else {
      await tx.userPreference.delete({ where: { id: current.id } });
    }

    const updated = await tx.preferenceProposal.update({
      where: { id: proposal.id },
      data: {
        status: "reverted",
        revertedAt: new Date(),
      },
    });

    return ok({
      proposal: toPreferenceProposalDto(updated),
      preference,
    });
  });
}

export async function getPreferenceProposalSource(input: {
  userId: string;
  proposalId: string;
}): Promise<
  ServiceResult<
    {
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
    },
    "not_found"
  >
> {
  const proposal = await prisma.preferenceProposal.findFirst({
    where: { id: input.proposalId, userId: input.userId },
    include: {
      sourceMessage: true,
      conversation: { select: { userId: true } },
    },
  });
  if (!proposal) {
    return err("not_found", "Proposal source not found.");
  }
  if (proposal.conversation && proposal.conversation.userId !== input.userId) {
    return err("not_found", "Proposal source not found.");
  }
  if (!isChatPreferenceCategory(proposal.category)) {
    return err("not_found", "Proposal source not found.");
  }

  if (proposal.source === "quiz" || !proposal.sourceMessage) {
    return ok({
      category: proposal.category,
      proposedValue: proposal.proposedValue,
      acceptedValue: proposal.acceptedValue,
      confidence: proposal.confidence,
      source: "quiz",
      sourceConversationId: proposal.conversationId,
      sourceMessageId: null,
      sourceMessageContent: "From your Design Quiz",
      sourceMessageTimestamp: proposal.createdAt.toISOString(),
      sourceMessageRole: "system",
    });
  }

  return ok({
    category: proposal.category,
    proposedValue: proposal.proposedValue,
    acceptedValue: proposal.acceptedValue,
    confidence: proposal.confidence,
    source: proposal.source || "chat",
    sourceConversationId: proposal.conversationId,
    sourceMessageId: proposal.sourceMessageId,
    sourceMessageContent: proposal.sourceMessage.content,
    sourceMessageTimestamp: proposal.sourceMessage.createdAt.toISOString(),
    sourceMessageRole: proposal.sourceMessage.role,
  });
}

/**
 * Extract + harden candidates only. Never writes confirmed memory or proposals.
 */
export async function extractPreferenceCandidates(input: {
  memoryEnabled: boolean;
  messageSource: ChatMessageSource;
  content: string;
  currentPreferences: Record<ChatPreferenceCategory, string | null>;
  /** When set, OpenAI extraction records CostLog rows. */
  userId?: string;
  conversationId?: string;
}): Promise<ExtractedPreferenceCandidate[]> {
  if (!input.memoryEnabled) return [];
  if (
    input.messageSource === "quick_suggestion" ||
    input.messageSource === "brainstorm"
  ) {
    return [];
  }

  let candidates: ExtractedPreferenceCandidate[] = [];
  try {
    const { provider } = getPreferenceExtractionProvider();
    const extractInput: {
      content: string;
      currentPreferences: Partial<Record<string, string>>;
      costContext?: {
        userId: string;
        conversationId: string | null;
      };
    } = {
      content: input.content,
      currentPreferences: Object.fromEntries(
        Object.entries(input.currentPreferences).filter(
          ([, value]) => value != null,
        ),
      ) as Partial<Record<string, string>>,
    };
    if (input.userId) {
      extractInput.costContext = {
        userId: input.userId,
        conversationId: input.conversationId ?? null,
      };
    }
    candidates = await provider.extract(extractInput);
  } catch (error) {
    console.error("[preference-extraction] failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return [];
  }

  candidates = hardenExtractedPreferenceCandidates({
    content: input.content,
    candidates,
    currentPreferences: input.currentPreferences,
  });

  if (input.messageSource === "room_starter") {
    candidates = candidates.filter(
      (candidate) => candidate.category === "room",
    );
  }

  return candidates;
}

/**
 * Persist pending proposals from already-extracted candidates.
 * Never writes confirmed memory.
 */
export async function persistPendingProposalsFromCandidates(input: {
  userId: string;
  conversationId: string;
  sourceMessageId: string;
  displayMessageId: string;
  candidates: ExtractedPreferenceCandidate[];
  currentPreferences: Record<ChatPreferenceCategory, string | null>;
}): Promise<PreferenceProposalDto[]> {
  const minConfidence = minExtractionConfidence();
  const maxCount = maxProposalsPerMessage();
  const pending = await prisma.preferenceProposal.findMany({
    where: {
      userId: input.userId,
      status: "pending",
    },
    select: { category: true, proposedValue: true },
  });

  const accepted: ExtractedPreferenceCandidate[] = [];
  for (const candidate of input.candidates) {
    if (accepted.length >= maxCount) break;
    if (candidate.confidence < minConfidence) continue;
    const normalized = normalizePreferenceValue(
      candidate.category,
      candidate.value,
    );
    if (!normalized) continue;
    const confirmed = input.currentPreferences[candidate.category];
    if (
      confirmed &&
      normalizePreferenceValue(candidate.category, confirmed) === normalized
    ) {
      continue;
    }
    const duplicatePending = pending.some(
      (row) =>
        row.category === candidate.category &&
        normalizePreferenceValue(candidate.category, row.proposedValue) ===
          normalized,
    );
    if (duplicatePending) continue;
    if (
      accepted.some(
        (row) =>
          row.category === candidate.category && row.value === normalized,
      )
    ) {
      continue;
    }
    accepted.push({ ...candidate, value: normalized });
  }

  if (accepted.length === 0) return [];

  const created = await prisma.$transaction(
    accepted.map((candidate) =>
      prisma.preferenceProposal.create({
        data: {
          userId: input.userId,
          conversationId: input.conversationId,
          sourceMessageId: input.sourceMessageId,
          displayMessageId: input.displayMessageId,
          source: "chat",
          category: candidate.category,
          proposedValue: candidate.value,
          previousValue: input.currentPreferences[candidate.category],
          confidence: candidate.confidence,
          status: "pending",
          evidenceText: candidate.evidenceText ?? null,
          evidenceStart: candidate.evidenceStart ?? null,
          evidenceEnd: candidate.evidenceEnd ?? null,
        },
      }),
    ),
  );

  return created.map(toPreferenceProposalDto);
}

/**
 * Create pending proposals from extracted candidates. Never writes confirmed memory.
 */
export async function createPendingProposalsFromExtraction(input: {
  userId: string;
  conversationId: string;
  sourceMessageId: string;
  displayMessageId: string;
  memoryEnabled: boolean;
  messageSource: ChatMessageSource;
  content: string;
  currentPreferences: Record<ChatPreferenceCategory, string | null>;
}): Promise<PreferenceProposalDto[]> {
  const candidates = await extractPreferenceCandidates({
    memoryEnabled: input.memoryEnabled,
    messageSource: input.messageSource,
    content: input.content,
    currentPreferences: input.currentPreferences,
  });
  return persistPendingProposalsFromCandidates({
    userId: input.userId,
    conversationId: input.conversationId,
    sourceMessageId: input.sourceMessageId,
    displayMessageId: input.displayMessageId,
    candidates,
    currentPreferences: input.currentPreferences,
  });
}
