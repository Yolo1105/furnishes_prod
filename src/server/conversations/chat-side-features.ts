import { z } from "zod";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  CostLimitError,
  generateStructured,
} from "@/server/structured-output/generate-structured";
import {
  getAssistantPersonaById,
  normalizeAssistantPersonaId,
} from "@/lib/eva/personas/catalog";
import { mergeAssistantIntoSystemPrompt } from "@/lib/eva/personas/prompt";
import { getConfirmedPreferenceMap } from "@/server/preferences/preference-service";
import { assertChatSendAllowed } from "@/server/conversations/chat-rate-limit";
import { CHAT_FAILURE_COST_LIMIT } from "@/server/conversations/chat-copy";

export const SuggestionsSchema = z.object({
  suggestions: z.array(z.string().min(1)).min(3).max(5),
});

export const BrainstormSchema = z.object({
  ideas: z.array(z.string().min(1)).min(3).max(3),
});

const DEFAULT_SUGGESTIONS = [
  "What style direction fits this room?",
  "Help me set a realistic budget range.",
  "Suggest a furniture plan for the main seating.",
];

function isSideFeaturesEnabled(): boolean {
  return process.env.CHAT_SIDE_FEATURES_ENABLED === "1";
}

function messagesToTranscript(
  messages: Array<{ role: string; content: string }>,
): string {
  return messages.map((m) => `${m.role}: ${m.content}`).join("\n");
}

async function loadOwnedConversation(input: {
  userId: string;
  conversationId: string;
  messageTake: number;
}) {
  return prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: input.messageTake,
        select: { role: true, content: true },
      },
    },
  });
}

function isCostLimitError(error: unknown): boolean {
  return error instanceof CostLimitError;
}

export async function generateConversationSuggestions(input: {
  userId: string;
  conversationId: string;
  mode?: "full" | "copilot";
}): Promise<
  ServiceResult<
    { suggestions: string[] },
    "not_found" | "disabled" | "rate_limited" | "daily_limit" | "cost_limit"
  >
> {
  if (!isSideFeaturesEnabled()) {
    return err("disabled", "Side features are disabled.");
  }
  if (
    input.mode === "copilot" &&
    process.env.CHAT_COPILOT_MODE_ENABLED === "1"
  ) {
    return err("disabled", "Suggestions are disabled in copilot mode.");
  }
  const quota = await assertChatSendAllowed({ userId: input.userId });
  if (!quota.ok) return quota;

  const conversation = await loadOwnedConversation({
    ...input,
    messageTake: 20,
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  if (conversation.messages.length < 2 || !process.env.OPENAI_API_KEY?.trim()) {
    return ok({ suggestions: DEFAULT_SUGGESTIONS });
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { activeAssistantId: true, memoryEnabled: true },
  });
  const persona = getAssistantPersonaById(
    normalizeAssistantPersonaId(user?.activeAssistantId),
  )!;
  const confirmed = user?.memoryEnabled
    ? await getConfirmedPreferenceMap(input.userId)
    : {};
  const prefs = Object.entries(confirmed)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");

  try {
    const system = mergeAssistantIntoSystemPrompt(
      'You propose 3-5 short next-message chips the user might send to Eva. Return JSON {"suggestions": string[]}. No numbering.',
      persona,
    );
    const result = await generateStructured({
      system,
      user: JSON.stringify({
        transcript: messagesToTranscript(conversation.messages).slice(0, 4000),
        preferences: prefs || "none",
      }),
      schema: SuggestionsSchema,
      temperature: 0.6,
      costContext: {
        userId: input.userId,
        conversationId: input.conversationId,
        kind: "suggestion",
      },
    });
    return ok({ suggestions: result.suggestions.slice(0, 5) });
  } catch (error) {
    if (isCostLimitError(error)) {
      return err("cost_limit", CHAT_FAILURE_COST_LIMIT);
    }
    return ok({ suggestions: DEFAULT_SUGGESTIONS });
  }
}

export async function generateConversationBrainstorm(input: {
  userId: string;
  conversationId: string;
  mode?: "full" | "copilot";
}): Promise<
  ServiceResult<
    { ideas: string[] },
    | "not_found"
    | "disabled"
    | "rate_limited"
    | "daily_limit"
    | "cost_limit"
    | "provider_unavailable"
  >
> {
  if (!isSideFeaturesEnabled()) {
    return err("disabled", "Side features are disabled.");
  }
  if (
    input.mode === "copilot" &&
    process.env.CHAT_COPILOT_MODE_ENABLED === "1"
  ) {
    return err("disabled", "Brainstorm is disabled in copilot mode.");
  }
  const quota = await assertChatSendAllowed({ userId: input.userId });
  if (!quota.ok) return quota;

  const conversation = await loadOwnedConversation({
    ...input,
    messageTake: 15,
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return err(
      "provider_unavailable",
      "Brainstorm requires an AI provider configuration.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { activeAssistantId: true, memoryEnabled: true },
  });
  const persona = getAssistantPersonaById(
    normalizeAssistantPersonaId(user?.activeAssistantId),
  )!;
  const confirmed = user?.memoryEnabled
    ? await getConfirmedPreferenceMap(input.userId)
    : {};
  const prefs = Object.entries(confirmed)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  try {
    const system = mergeAssistantIntoSystemPrompt(
      'You brainstorm three distinct interior-design idea paragraphs. Return JSON {"ideas": [string, string, string]}. No SKUs or shopping links.',
      persona,
    );
    const result = await generateStructured({
      system,
      user: JSON.stringify({
        transcript: messagesToTranscript(conversation.messages).slice(0, 4000),
        preferences: prefs || "none",
      }),
      schema: BrainstormSchema,
      temperature: 0.7,
      costContext: {
        userId: input.userId,
        conversationId: input.conversationId,
        kind: "brainstorm",
      },
    });
    return ok({ ideas: result.ideas.slice(0, 3) });
  } catch (error) {
    if (isCostLimitError(error)) {
      return err("cost_limit", CHAT_FAILURE_COST_LIMIT);
    }
    return err(
      "provider_unavailable",
      "Brainstorm is temporarily unavailable.",
    );
  }
}
