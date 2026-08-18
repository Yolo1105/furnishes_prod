/**
 * Room restyle (img2img) — keep architecture, change furnishings only.
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { checkCostAllowance, recordCost } from "@/server/ops/cost-guard";
import { logOps } from "@/server/ops/log";
import { getPrivateStorage } from "@/server/storage/private-storage";
import { getOwnedUpload, readUploadBytes } from "@/server/uploads/service";
import {
  getDesignBrief,
  isDesignBriefEnabled,
} from "@/server/design-brief/build-design-brief";
import { validateGeneratedImageBytes } from "./image-validation";
import { TEST_PNG_BYTES } from "./provider-test";
import { resolveModel } from "@/server/model-routing/model-router";

const RESTYLE_PROMPT_PREFIX = "[restyle]";

const STRUCTURE_PIN =
  "Keep walls, windows, doors, geometry, and camera identical; change only furnishings, materials, colors, decor.";

export function isChatRendersEnabled(): boolean {
  return process.env.CHAT_RENDERS_ENABLED === "1";
}

function restyleProviderName(): "disabled" | "test" | "http" {
  const raw = (process.env.IMAGE_RESTYLE_PROVIDER ?? "disabled")
    .trim()
    .toLowerCase();
  if (raw === "test" || raw === "http") return raw;
  return "disabled";
}

function rendersDailyLimit(): number {
  const raw = Number(process.env.RENDERS_DAILY_LIMIT ?? "10");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 10;
}

async function countRendersToday(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return prisma.imageGeneration.count({
    where: {
      userId,
      createdAt: { gte: start },
      prompt: { startsWith: RESTYLE_PROMPT_PREFIX },
    },
  });
}

export function buildRestyleStylePrompt(input: {
  styleDirection?: string | null;
  brief?: {
    style: { primary: string | null; secondary: string[] };
    palette: { colors: string[] };
    items: Array<{ label: string; status: string }>;
  } | null;
}): string {
  const parts: string[] = [STRUCTURE_PIN];
  if (input.brief) {
    const styleBits = [
      input.brief.style.primary,
      ...input.brief.style.secondary,
    ].filter(Boolean);
    if (styleBits.length) {
      parts.push(`Style direction from design brief: ${styleBits.join(", ")}.`);
    }
    if (input.brief.palette.colors.length) {
      parts.push(`Palette: ${input.brief.palette.colors.join(", ")}.`);
    }
    const decided = input.brief.items
      .filter(
        (item) => item.status === "decided" || item.status === "purchased",
      )
      .map((item) => item.label);
    if (decided.length) {
      parts.push(
        `Decided pieces to reflect: ${decided.slice(0, 12).join(", ")}.`,
      );
    }
  }
  if (input.styleDirection?.trim()) {
    parts.push(`Additional direction: ${input.styleDirection.trim()}`);
  }
  if (parts.length === 1) {
    parts.push(
      "Apply a cohesive residential interior refresh consistent with the room.",
    );
  }
  return parts.join(" ");
}

type RestyleProviderResult = {
  imageBytes: Uint8Array;
  mimeType: string;
  providerJobId: string;
};

async function callHttpRestyle(input: {
  stylePrompt: string;
  strength: number;
  sourceBytes: Buffer;
  sourceMime: string;
}): Promise<RestyleProviderResult> {
  const baseUrl = process.env.IMAGE_GENERATION_API_URL?.replace(/\/$/, "");
  const apiKey = process.env.IMAGE_GENERATION_API_KEY?.trim();
  const model =
    process.env.IMAGE_RESTYLE_MODEL?.trim() ||
    process.env.IMAGE_GENERATION_MODEL?.trim();
  if (!baseUrl || !apiKey || !model) {
    throw new Error("restyle_misconfigured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(`${baseUrl}/restyle`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: input.stylePrompt,
        strength: input.strength,
        image_base64: input.sourceBytes.toString("base64"),
        mime_type: input.sourceMime,
      }),
    });
    if (!response.ok) throw new Error(`restyle_http_${response.status}`);
    const payload = (await response.json()) as {
      jobId?: string;
      imageUrl?: string;
      imageBase64?: string;
      mimeType?: string;
    };
    if (payload.imageBase64) {
      return {
        providerJobId: payload.jobId ?? randomUUID(),
        imageBytes: Uint8Array.from(Buffer.from(payload.imageBase64, "base64")),
        mimeType: payload.mimeType ?? "image/png",
      };
    }
    if (!payload.imageUrl) throw new Error("restyle_empty");
    const imageRes = await fetch(payload.imageUrl, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!imageRes.ok) throw new Error("restyle_download");
    const mimeType = imageRes.headers.get("content-type") ?? "image/png";
    const bytes = new Uint8Array(await imageRes.arrayBuffer());
    return {
      providerJobId: payload.jobId ?? randomUUID(),
      imageBytes: bytes,
      mimeType: mimeType.split(";")[0]!.trim(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runRestyleProvider(input: {
  stylePrompt: string;
  strength: number;
  sourceBytes: Buffer;
  sourceMime: string;
}): Promise<RestyleProviderResult> {
  const name = restyleProviderName();
  if (name === "disabled") {
    throw new Error("restyle_disabled");
  }
  if (name === "test") {
    return {
      providerJobId: `restyle-test-${randomUUID()}`,
      imageBytes: TEST_PNG_BYTES,
      mimeType: "image/png",
    };
  }
  return callHttpRestyle(input);
}

const StructureCheckSchema = z.object({
  sameStructure: z.boolean(),
  confidence: z.number().min(0).max(1),
});

async function postCheckStructure(input: {
  userId: string;
  conversationId: string;
  sourceBytes: Buffer;
  sourceMime: string;
  resultBytes: Uint8Array;
  resultMime: string;
}): Promise<{ sameStructure: boolean; confidence: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    logOps("info", "render_structure_check", {
      userId: input.userId,
      conversationId: input.conversationId,
      skipped: true,
      reason: "no_api_key",
    });
    return null;
  }

  const model = resolveModel("vision");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Compare two room photos. Answer JSON {"sameStructure":boolean,"confidence":0-1}: are walls, windows, doors, geometry, and camera the same?',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Image 1 is the source room. Image 2 is the restyle. Same room structure?",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.sourceMime};base64,${input.sourceBytes.toString("base64")}`,
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.resultMime};base64,${Buffer.from(input.resultBytes).toString("base64")}`,
                },
              },
            ],
          },
        ],
      }),
    });
    if (!response.ok) {
      logOps("warn", "render_structure_check", {
        userId: input.userId,
        conversationId: input.conversationId,
        skipped: true,
        reason: "provider_http",
      });
      return null;
    }
    const payload = (await response.json()) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    const parsed = StructureCheckSchema.safeParse(JSON.parse(raw));
    await recordCost({
      userId: input.userId,
      conversationId: input.conversationId,
      model,
      kind: "vision",
      usage: {
        promptTokens: payload.usage?.prompt_tokens ?? 0,
        completionTokens: payload.usage?.completion_tokens ?? 0,
      },
    });
    const verdict = parsed.success
      ? {
          sameStructure: parsed.data.sameStructure,
          confidence: parsed.data.confidence,
        }
      : null;
    logOps("info", "render_structure_check", {
      userId: input.userId,
      conversationId: input.conversationId,
      sameStructure: verdict?.sameStructure ?? null,
      confidence: verdict?.confidence ?? null,
      provider: restyleProviderName(),
      failed: verdict != null && !verdict.sameStructure,
    });
    return verdict;
  } catch {
    logOps("warn", "render_structure_check", {
      userId: input.userId,
      conversationId: input.conversationId,
      skipped: true,
      reason: "exception",
    });
    return null;
  }
}

async function restyleRoomImage(input: {
  userId: string;
  conversationId: string;
  sourceUploadId: string;
  stylePrompt: string;
  strength?: number;
  clientRenderId?: string | null;
}): Promise<
  ServiceResult<
    {
      generationId: string;
      outputUploadId: string;
      stylePrompt: string;
      structureCheck: {
        sameStructure: boolean;
        confidence: number;
      } | null;
    },
    | "disabled"
    | "not_found"
    | "forbidden"
    | "rate_limited"
    | "cost_limit"
    | "provider_unavailable"
    | "storage_failed"
    | "validation"
  >
> {
  if (!isChatRendersEnabled()) {
    return err("disabled", "Renders are disabled.");
  }
  if (restyleProviderName() === "disabled") {
    return err("provider_unavailable", "Restyle provider is disabled.");
  }

  const clientRenderId = input.clientRenderId?.trim() || null;
  if (clientRenderId) {
    const existing = await prisma.imageGeneration.findFirst({
      where: {
        userId: input.userId,
        clientRenderId,
        status: "ready",
        outputUploadId: { not: null },
      },
      select: {
        id: true,
        outputUploadId: true,
        prompt: true,
        structureCheck: true,
      },
    });
    if (existing?.outputUploadId) {
      const prior =
        existing.structureCheck &&
        typeof existing.structureCheck === "object" &&
        existing.structureCheck !== null &&
        "sameStructure" in existing.structureCheck
          ? (existing.structureCheck as {
              sameStructure: boolean;
              confidence: number;
            })
          : null;
      return ok({
        generationId: existing.id,
        outputUploadId: existing.outputUploadId,
        stylePrompt: existing.prompt,
        structureCheck: prior,
      });
    }
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, userId: input.userId },
    select: { id: true, projectId: true },
  });
  if (!conversation) return err("not_found", "Conversation not found.");

  const upload = await getOwnedUpload(input.userId, input.sourceUploadId);
  if (!upload) return err("not_found", "Upload not found.");
  if (upload.status !== "ready" || !upload.mimeType.startsWith("image/")) {
    return err("validation", "Source upload must be a ready image.");
  }

  const used = await countRendersToday(input.userId);
  if (used >= rendersDailyLimit()) {
    return err("rate_limited", "Daily render limit reached.");
  }

  const allowance = await checkCostAllowance({
    userId: input.userId,
    conversationId: input.conversationId,
  });
  if (!allowance.allowed) {
    return err("cost_limit", "Cost limit reached.");
  }

  const strength =
    typeof input.strength === "number" && Number.isFinite(input.strength)
      ? Math.min(1, Math.max(0.1, input.strength))
      : 0.55;

  const sourceBytes = await readUploadBytes(upload.storageKey);
  const stylePrompt = `${RESTYLE_PROMPT_PREFIX} ${input.stylePrompt}`.slice(
    0,
    4000,
  );

  let providerResult: RestyleProviderResult;
  try {
    providerResult = await runRestyleProvider({
      stylePrompt,
      strength,
      sourceBytes,
      sourceMime: upload.mimeType,
    });
  } catch {
    return err("provider_unavailable", "Restyle provider failed.");
  }

  const checked = validateGeneratedImageBytes(
    providerResult.imageBytes,
    providerResult.mimeType,
  );
  if (!checked.ok) {
    return err("storage_failed", checked.message);
  }

  const filename = `restyle-${randomUUID().slice(0, 8)}.png`;
  const storageKey = `${input.userId}/generated/${randomUUID()}-${filename}`;
  try {
    await getPrivateStorage().putObject({
      key: storageKey,
      bytes: providerResult.imageBytes,
      mimeType: checked.mimeType,
    });
  } catch {
    return err("storage_failed", "Could not store restyled image.");
  }

  const output = await prisma.upload.create({
    data: {
      userId: input.userId,
      projectId: conversation.projectId,
      filename,
      mimeType: checked.mimeType,
      sizeBytes: providerResult.imageBytes.byteLength,
      status: "ready",
      source: "generated_image",
      storageKey,
    },
  });

  const structureCheck = await postCheckStructure({
    userId: input.userId,
    conversationId: input.conversationId,
    sourceBytes,
    sourceMime: upload.mimeType,
    resultBytes: providerResult.imageBytes,
    resultMime: checked.mimeType,
  });

  const generation = await prisma.imageGeneration.create({
    data: {
      userId: input.userId,
      projectId: conversation.projectId,
      prompt: stylePrompt,
      status: "ready",
      provider: `restyle-${restyleProviderName()}`,
      providerJobId: providerResult.providerJobId,
      ...(clientRenderId ? { clientRenderId } : {}),
      ...(structureCheck
        ? {
            structureCheck: {
              sameStructure: structureCheck.sameStructure,
              confidence: structureCheck.confidence,
            },
          }
        : {}),
      width: 1024,
      height: 1024,
      outputUploadId: output.id,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await recordCost({
    userId: input.userId,
    conversationId: input.conversationId,
    model: resolveModel("image"),
    kind: "image",
    usage: { promptTokens: 1200, completionTokens: 0 },
  });

  return ok({
    generationId: generation.id,
    outputUploadId: output.id,
    stylePrompt,
    structureCheck,
  });
}

export async function createConversationRender(input: {
  userId: string;
  conversationId: string;
  uploadId: string;
  styleDirection?: string | null;
  clientRenderId?: string | null;
}): Promise<
  ServiceResult<
    {
      generationId: string;
      outputUploadId: string;
      stylePrompt: string;
      structureCheck: {
        sameStructure: boolean;
        confidence: number;
      } | null;
    },
    | "disabled"
    | "not_found"
    | "forbidden"
    | "rate_limited"
    | "cost_limit"
    | "provider_unavailable"
    | "storage_failed"
    | "validation"
  >
> {
  let brief: Parameters<typeof buildRestyleStylePrompt>[0]["brief"] = null;
  if (isDesignBriefEnabled()) {
    const briefResult = await getDesignBrief({
      userId: input.userId,
      conversationId: input.conversationId,
      skipNarrative: true,
    });
    if (briefResult.ok) {
      brief = {
        style: briefResult.value.style,
        palette: briefResult.value.palette,
        items: briefResult.value.items,
      };
    }
  }

  const stylePrompt = buildRestyleStylePrompt({
    ...(input.styleDirection != null
      ? { styleDirection: input.styleDirection }
      : {}),
    brief,
  });

  return restyleRoomImage({
    userId: input.userId,
    conversationId: input.conversationId,
    sourceUploadId: input.uploadId,
    stylePrompt,
    ...(input.clientRenderId != null
      ? { clientRenderId: input.clientRenderId }
      : {}),
  });
}
