/**
 * Multi-round OpenAI tool loop (max 3 rounds; wall-clock timeout).
 */

import {
  checkCostAllowance,
  recordCostAndRecheck,
} from "@/server/ops/cost-guard";
import {
  chatToolsTimeoutMs,
  executeChatTool,
  toolsToOpenAiDefinitions,
  type ChatToolContext,
  type ChatToolMode,
} from "./chat-tools";

type ToolActivityStatus = "started" | "finished" | "error";

type ToolLoopResult = {
  content: string;
  toolsFired: string[];
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
};

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export async function runOpenAiToolLoop(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  ctx: ChatToolContext;
  mode: ChatToolMode;
  signal?: AbortSignal;
  onToolActivity?: (tool: string, status: ToolActivityStatus) => void;
  /** Skip round-0 check when the send path already called `checkCostAllowance`. */
  costAlreadyChecked?: boolean;
}): Promise<ToolLoopResult> {
  const tools = toolsToOpenAiDefinitions(input.mode);
  const toolsFired: string[] = [];
  if (tools.length === 0) {
    return {
      content: "",
      toolsFired,
      model: input.model,
      promptTokens: null,
      completionTokens: null,
    };
  }

  const startedAt = Date.now();
  const timeoutMs = chatToolsTimeoutMs();
  const messages: ChatMessage[] = [
    { role: "system", content: input.systemPrompt },
    ...input.history.filter((m) => m.role !== "system"),
  ];

  let promptTokens = 0;
  let completionTokens = 0;
  let finalContent = "";

  for (let round = 0; round < 3; round += 1) {
    if (Date.now() - startedAt > timeoutMs) {
      break;
    }
    if (input.signal?.aborted) break;

    if (!(input.costAlreadyChecked && round === 0)) {
      const allowance = await checkCostAllowance({
        userId: input.ctx.userId,
        conversationId: input.ctx.conversationId,
      });
      if (!allowance.allowed) {
        finalContent =
          finalContent ||
          "I hit a cost limit before I could finish tool work — try again later.";
        break;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(5_000, timeoutMs - (Date.now() - startedAt)),
    );
    const signal =
      input.signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([input.signal, controller.signal])
        : controller.signal;

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal,
        headers: {
          authorization: `Bearer ${input.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          temperature: 0.4,
          messages,
          tools,
          tool_choice: round === 0 ? "auto" : "auto",
        }),
      });
    } catch {
      clearTimeout(timer);
      break;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) break;
    const payload = (await response.json()) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    promptTokens += payload.usage?.prompt_tokens ?? 0;
    completionTokens += payload.usage?.completion_tokens ?? 0;
    await recordCostAndRecheck({
      userId: input.ctx.userId,
      conversationId: input.ctx.conversationId,
      model: input.model,
      kind: "chat",
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
      },
    });

    const message = payload.choices?.[0]?.message;
    if (!message) break;

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      finalContent = (message.content ?? "").trim();
      break;
    }

    messages.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const name = call.function.name;
      toolsFired.push(name);
      input.onToolActivity?.(name, "started");
      const result = await executeChatTool({
        name,
        argsJson: call.function.arguments ?? "{}",
        ctx: input.ctx,
      });
      input.onToolActivity?.(
        name,
        result.startsWith("error:") ? "error" : "finished",
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      });
    }
  }

  return {
    content: finalContent,
    toolsFired,
    model: input.model,
    promptTokens,
    completionTokens,
  };
}
