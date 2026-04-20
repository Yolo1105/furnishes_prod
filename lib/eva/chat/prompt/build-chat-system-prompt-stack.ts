import { buildSafeSystemPrompt } from "@/lib/eva/core/guardrails";
import { getResponseLengthInstruction } from "@/lib/eva/core/response-length";
import {
  appendCompareIntentGuidance,
  appendRecommendationChatVoice,
} from "@/lib/eva/core/chat-conversation-prompt";
import {
  criticalTurnFactsToPromptBlock,
  extractCriticalTurnFacts,
} from "@/lib/eva/core/critical-turn-extraction";
import { mergeAssistantIntoSystemPrompt } from "@/lib/eva/assistants/prompt";
import type { AssistantDefinition } from "@/lib/eva/assistants/catalog";
import { mergeDesignWorkflowIntoSystemPrompt } from "@/lib/eva/design-workflow/prompt";
import type { WorkflowStageId } from "@/lib/eva/design-workflow/stages";
import { formatProjectMemoryForSystemPrompt } from "@/lib/eva/intelligence/project-memory-prompt";
import type { buildProjectIntelligenceContext } from "@/lib/eva/intelligence/project-intelligence-context";
import { studioSnapshotToPromptBlock } from "@/lib/eva/studio/studio-snapshot-to-prompt";
import type { StudioSnapshotPayload } from "@/lib/eva/studio/studio-snapshot-schema";
import type { ResponseLengthHint } from "@/lib/eva/playbook/types";
import type { ActiveNodeResult } from "@/lib/eva/playbook/runtime";
import type { ChatGroundingLayers } from "@/lib/eva/chat/grounding/build-chat-grounding-layers";
import type { DomainConfig } from "@/lib/eva/domain/config";

type ProjectIntel = Awaited<ReturnType<typeof buildProjectIntelligenceContext>>;

export type ChatPromptStackParameters = {
  domainConfig: DomainConfig;
  systemSuffix: string;
  message: string;
  studioSnapshotPayload: StudioSnapshotPayload | null;
  assistantForPrompt: AssistantDefinition;
  designWorkflowStage: WorkflowStageId | null;
  projectIntel: ProjectIntel | null;
  playbookNodeConfig: ActiveNodeResult["config"] & {
    systemPromptSuffix?: string;
    responseLength?: ResponseLengthHint;
  };
  grounding: ChatGroundingLayers;
};

export type ChatModelPromptResult = {
  systemPrompt: string;
  modelMessages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
};

const PLAYBOOK_LENGTH_MAP: Record<
  ResponseLengthHint,
  (message: string) => string
> = {
  short: () => "Respond in 1-2 short sentences.",
  medium: () => "Respond concisely; 1-2 paragraphs.",
  detailed: () =>
    "Go deep when helpful, but keep a conversational voice—avoid sounding like a status report unless they asked for one.",
  auto: (userMessage: string) => getResponseLengthInstruction(userMessage),
};

/**
 * Builds safe system prompt text and model messages from domain, playbook, grounding layers, and user message.
 */
export function buildChatSystemPromptStack(
  parameters: ChatPromptStackParameters,
  messagesFromContext: Array<{ role: string; content: string }>,
): ChatModelPromptResult {
  const {
    domainConfig,
    systemSuffix,
    message,
    studioSnapshotPayload,
    assistantForPrompt,
    designWorkflowStage,
    projectIntel,
    playbookNodeConfig,
    grounding,
  } = parameters;

  let basePrompt = (domainConfig.system_prompt || "").trim() + systemSuffix;
  basePrompt = mergeAssistantIntoSystemPrompt(basePrompt, assistantForPrompt);

  if (designWorkflowStage && projectIntel) {
    basePrompt = mergeDesignWorkflowIntoSystemPrompt(
      basePrompt,
      designWorkflowStage,
      projectIntel.workflowEvaluation,
    );
    basePrompt = `${basePrompt.trim()}\n\n${formatProjectMemoryForSystemPrompt(projectIntel)}`;
  } else if (designWorkflowStage) {
    basePrompt = mergeDesignWorkflowIntoSystemPrompt(
      basePrompt,
      designWorkflowStage,
    );
  }

  if (playbookNodeConfig.systemPromptSuffix) {
    basePrompt += `\n\n${playbookNodeConfig.systemPromptSuffix}`;
  }

  const criticalFacts = extractCriticalTurnFacts(message);
  basePrompt += `\n\n${criticalTurnFactsToPromptBlock(criticalFacts)}`;

  if (studioSnapshotPayload) {
    basePrompt += `\n\n${studioSnapshotToPromptBlock(studioSnapshotPayload)}`;
  }

  if (grounding.attachmentGrounding.promptBlock.trim().length > 0) {
    basePrompt += `\n\n${grounding.attachmentGrounding.promptBlock}`;
  }

  if (grounding.designRuleAppendix) {
    basePrompt += `\n\n${grounding.designRuleAppendix}`;
  }

  if (grounding.retrievalPromptAppendix.length > 0) {
    basePrompt += grounding.retrievalPromptAppendix;
  }

  if (grounding.layoutAppendix) {
    basePrompt += `\n\n${grounding.layoutAppendix}`;
  }

  const lengthHint: ResponseLengthHint =
    playbookNodeConfig.responseLength ?? "auto";
  basePrompt += `\n\n${PLAYBOOK_LENGTH_MAP[lengthHint](message)}`;
  basePrompt = appendCompareIntentGuidance(basePrompt, message);
  if (projectIntel) {
    basePrompt = appendRecommendationChatVoice(basePrompt);
  }

  const systemPrompt = buildSafeSystemPrompt(basePrompt);

  const modelMessages = messagesFromContext.map((row) => ({
    role: row.role as "user" | "assistant" | "system",
    content: row.content,
  }));

  return { systemPrompt, modelMessages };
}
