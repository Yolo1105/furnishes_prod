import { envInt } from "@/server/env";
import { cache } from "react";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  assistantPersonaSummary,
  getAssistantPersonaById,
  listAssistantPersonas,
  normalizeAssistantPersonaId,
} from "@/lib/eva/personas/catalog";
import type { AssistantPersonaSummary } from "@/lib/eva/personas/persona-types";
import {
  listConfirmedPreferences,
  listPendingPreferenceProposals,
} from "@/server/preferences/preference-service";
import {
  preferenceMapFromDetails,
  type PreferenceProposalDto,
  type ChatPreferenceCategory,
  type ConfirmedPreferenceDto,
} from "@/server/preferences/preference-types";

function chatBootstrapMessageTake(): number {
  return envInt("CHAT_BOOTSTRAP_MESSAGE_TAKE", 100) || 100;
}

export type ChatBootstrap = {
  conversation: {
    id: string;
    title: string;
    status: string;
    projectId: string | null;
    projectName: string | null;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      status: string;
      errorCode: string | null;
      assistantId: string | null;
      createdAt: string;
      feedback: string | null;
    }>;
  };
  assistantPersona: AssistantPersonaSummary;
  availablePersonas: AssistantPersonaSummary[];
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  confirmedPreferenceDetails: ConfirmedPreferenceDto[];
  pendingProposals: PreferenceProposalDto[];
  memoryEnabled: boolean;
};

export const getChatBootstrap = cache(async function getChatBootstrap(
  userId: string,
  conversationId: string,
): Promise<ServiceResult<ChatBootstrap, "not_found">> {
  const [user, conversation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeAssistantId: true, memoryEnabled: true },
    }),
    prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        project: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: chatBootstrapMessageTake(),
          include: { feedback: { select: { rating: true } } },
        },
      },
    }),
  ]);

  if (!user || !conversation) {
    return err("not_found", "Conversation not found.");
  }

  const persona = getAssistantPersonaById(
    normalizeAssistantPersonaId(user.activeAssistantId),
  )!;

  const [confirmedPreferenceDetails, pendingProposals] = await Promise.all([
    user.memoryEnabled ? listConfirmedPreferences(userId) : Promise.resolve([]),
    user.memoryEnabled
      ? listPendingPreferenceProposals({ userId, conversationId })
      : Promise.resolve([]),
  ]);
  const confirmedMap = preferenceMapFromDetails(confirmedPreferenceDetails);

  const chronological = [...conversation.messages].reverse();

  return ok({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status,
      projectId: conversation.projectId,
      projectName: conversation.project?.name ?? null,
      messages: chronological.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        errorCode: message.errorCode,
        assistantId: message.assistantId,
        createdAt: message.createdAt.toISOString(),
        feedback: message.feedback?.rating ?? null,
      })),
    },
    assistantPersona: assistantPersonaSummary(persona),
    availablePersonas: listAssistantPersonas().map(assistantPersonaSummary),
    confirmedPreferences: confirmedMap,
    confirmedPreferenceDetails,
    pendingProposals,
    memoryEnabled: user.memoryEnabled,
  });
});
