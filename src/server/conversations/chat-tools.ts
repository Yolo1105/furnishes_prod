/**
 * Chat tool registry — whitelist only; tool calls are untrusted input.
 */

import { z } from "zod";
import { zodToJsonSchema } from "@/server/structured-output/zod-to-json-schema";
import { checkCostAllowance } from "@/server/ops/cost-guard";
import { logOps } from "@/server/ops/log";
import { updateRoomPlanItem } from "@/server/room-plan/service";
import {
  regenerateConversationRecommendations,
  saveRecommendationToInspiration,
} from "@/server/recommendations/service";
import {
  getDesignBrief,
  isDesignBriefEnabled,
} from "@/server/design-brief/build-design-brief";
import {
  createConversationRender,
  isChatRendersEnabled,
} from "@/server/image-generation/restyle";
import { isChatRoomPlanEnabled } from "@/server/room-plan/service";

type ChatToolName =
  | "update_room_plan_item"
  | "generate_recommendations"
  | "save_to_inspiration"
  | "create_render"
  | "get_design_brief";

export type ChatToolMode = "full" | "copilot";

export type ChatToolContext = {
  userId: string;
  conversationId: string;
  mode: ChatToolMode;
};

type ToolDef = {
  name: ChatToolName;
  description: string;
  parameters: z.ZodType;
  featureEnabled: () => boolean;
  allowedIn: ChatToolMode[];
  execute: (args: unknown, ctx: ChatToolContext) => Promise<string>;
};

function sideFeaturesOn(): boolean {
  return process.env.CHAT_SIDE_FEATURES_ENABLED === "1";
}

const updateRoomPlanItemParams = z.object({
  roomPlanId: z.string().min(1),
  itemId: z.string().min(1),
  status: z.string().optional(),
  label: z.string().optional(),
  notes: z.string().nullable().optional(),
});

const generateRecommendationsParams = z.object({});

const saveToInspirationParams = z.object({
  stableId: z.string().min(1),
});

const createRenderParams = z.object({
  uploadId: z.string().min(1),
  styleDirection: z.string().max(500).optional(),
});

const getDesignBriefParams = z.object({
  roomPlanId: z.string().optional(),
});

const TOOLS: ToolDef[] = [
  {
    name: "update_room_plan_item",
    description: "Update a room plan item status, label, or notes.",
    parameters: updateRoomPlanItemParams,
    featureEnabled: () => isChatRoomPlanEnabled(),
    allowedIn: ["full", "copilot"],
    async execute(args, ctx) {
      const parsed = updateRoomPlanItemParams.safeParse(args);
      if (!parsed.success) return "error: invalid params";
      const result = await updateRoomPlanItem({
        userId: ctx.userId,
        roomPlanId: parsed.data.roomPlanId,
        itemId: parsed.data.itemId,
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.label ? { label: parsed.data.label } : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: parsed.data.notes }
          : {}),
      });
      if (!result.ok) return `error: ${result.error}`;
      return `ok: room plan updated (score ${result.value.plan.readiness.score})`;
    },
  },
  {
    name: "generate_recommendations",
    description:
      "Generate interior design archetype recommendations for this conversation.",
    parameters: generateRecommendationsParams,
    featureEnabled: () => sideFeaturesOn(),
    allowedIn: ["full"],
    async execute(_args, ctx) {
      const result = await regenerateConversationRecommendations({
        userId: ctx.userId,
        conversationId: ctx.conversationId,
      });
      if (!result.ok) return `error: ${result.error}`;
      return `ok: ${result.value.items.length} recommendations ready`;
    },
  },
  {
    name: "save_to_inspiration",
    description: "Save a recommendation archetype to the inspiration board.",
    parameters: saveToInspirationParams,
    featureEnabled: () => sideFeaturesOn(),
    allowedIn: ["full"],
    async execute(args, ctx) {
      const parsed = saveToInspirationParams.safeParse(args);
      if (!parsed.success) return "error: invalid params";
      const result = await saveRecommendationToInspiration({
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        stableId: parsed.data.stableId,
      });
      if (!result.ok) return `error: ${result.error}`;
      return `ok: saved inspiration ${result.value.inspirationId}`;
    },
  },
  {
    name: "create_render",
    description: "Restyle a room photo using the design brief and upload.",
    parameters: createRenderParams,
    featureEnabled: () => isChatRendersEnabled(),
    allowedIn: ["full"],
    async execute(args, ctx) {
      const parsed = createRenderParams.safeParse(args);
      if (!parsed.success) return "error: invalid params";
      const result = await createConversationRender({
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        uploadId: parsed.data.uploadId,
        ...(parsed.data.styleDirection
          ? { styleDirection: parsed.data.styleDirection }
          : {}),
      });
      if (!result.ok) return `error: ${result.error}`;
      return `ok: render ${result.value.generationId}`;
    },
  },
  {
    name: "get_design_brief",
    description: "Fetch the current DesignBriefV1 narrative and facts.",
    parameters: getDesignBriefParams,
    featureEnabled: () => isDesignBriefEnabled(),
    allowedIn: ["full", "copilot"],
    async execute(args, ctx) {
      const parsed = getDesignBriefParams.safeParse(args);
      if (!parsed.success) return "error: invalid params";
      const result = await getDesignBrief({
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        ...(parsed.data.roomPlanId
          ? { roomPlanId: parsed.data.roomPlanId }
          : {}),
        skipNarrative: false,
      });
      if (!result.ok) return `error: ${result.error}`;
      return `ok: ${result.value.narrative.slice(0, 500)}`;
    },
  },
];

export function isChatToolsEnabled(): boolean {
  return process.env.CHAT_TOOLS_ENABLED === "1";
}

export function chatToolsTimeoutMs(): number {
  const raw = Number(process.env.CHAT_TOOLS_TIMEOUT_MS ?? "30000");
  return Number.isFinite(raw) && raw > 0 ? raw : 30_000;
}

export function chatToolsRolloutMode():
  "off" | "shadow" | "allowlist" | "percent" {
  if (!isChatToolsEnabled()) return "off";
  const raw = (process.env.CHAT_TOOLS_ROLLOUT ?? "shadow").trim().toLowerCase();
  if (raw === "allowlist" || raw === "percent" || raw === "shadow") return raw;
  return "shadow";
}

function parseAllowlist(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const value = part.trim().toLowerCase();
    if (value) set.add(value);
  }
  return set;
}

export function isChatToolsExecuteEnabled(input: {
  userId: string;
  email?: string | null;
}): boolean {
  const mode = chatToolsRolloutMode();
  if (mode === "off" || mode === "shadow") return false;
  if (mode === "allowlist") {
    const allow = parseAllowlist(process.env.CHAT_TOOLS_ALLOWLIST);
    const email = input.email?.trim().toLowerCase() ?? "";
    return (email && allow.has(email)) || allow.has(input.userId.toLowerCase());
  }
  const percent = Number(process.env.CHAT_TOOLS_ROLLOUT_PERCENT ?? "0");
  if (!Number.isFinite(percent) || percent <= 0) return false;
  if (percent >= 100) return true;
  const bucket =
    [...input.userId].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 100;
  return bucket < percent;
}

export function listEnabledTools(input: { mode: ChatToolMode }): ToolDef[] {
  return TOOLS.filter(
    (tool) => tool.featureEnabled() && tool.allowedIn.includes(input.mode),
  );
}

export function toolsToOpenAiDefinitions(mode: ChatToolMode): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}> {
  return listEnabledTools({ mode }).map((tool) => {
    const converted = zodToJsonSchema(tool.parameters, tool.name);
    return {
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: converted.schema,
      },
    };
  });
}

export async function executeChatTool(input: {
  name: string;
  argsJson: string;
  ctx: ChatToolContext;
}): Promise<string> {
  try {
    const tool = listEnabledTools({ mode: input.ctx.mode }).find(
      (row) => row.name === input.name,
    );
    if (!tool) return `error: tool_not_available`;

    const allowance = await checkCostAllowance({
      userId: input.ctx.userId,
      conversationId: input.ctx.conversationId,
    });
    if (!allowance.allowed) return "error: cost_limit";

    let args: unknown = {};
    try {
      args = input.argsJson.trim() ? JSON.parse(input.argsJson) : {};
    } catch {
      return "error: invalid_json_args";
    }

    return await tool.execute(args, input.ctx);
  } catch {
    return "error: executor_failed";
  }
}

/**
 * Shadow / heuristic: which tools would likely fire for this user text.
 * Never executes tools. Used when rollout=shadow.
 */
export function inferWouldFireTools(message: string): ChatToolName[] {
  const lower = message.toLowerCase();
  if (/ignore (all )?(previous|prior) (instructions|rules)/i.test(lower)) {
    return [];
  }
  if (
    /just tell me what to buy|what should i buy|generate recommendations|recommend (pieces|furniture)/i.test(
      lower,
    )
  ) {
    return ["generate_recommendations"];
  }
  if (/\b(my brief|design brief|get (my )?brief)\b/i.test(lower)) {
    return ["get_design_brief"];
  }
  if (/\b(render|restyle) (my |the )?room\b/i.test(lower)) {
    return ["create_render"];
  }
  if (/\b(update|mark) .*(plan item|as decided)\b/i.test(lower)) {
    return ["update_room_plan_item"];
  }
  return [];
}

export function logToolShadow(input: {
  userId: string;
  conversationId: string;
  tools: ChatToolName[];
}): void {
  if (input.tools.length === 0) return;
  logOps("info", "chat_tools_shadow", {
    userId: input.userId,
    conversationId: input.conversationId,
    toolCount: input.tools.length,
    tools: input.tools.join(","),
  });
}
