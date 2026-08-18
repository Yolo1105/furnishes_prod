/**
 * Chat attachment grounding: resolve owned uploads → vision summaries → prompt block.
 * Re-derived from legacy `lib/eva/chat/attachments/*` (upload-id path; no client URL lifecycle).
 */

import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { getPrivateStorage } from "@/server/storage/private-storage";
import { recordCost } from "@/server/ops/cost-guard";
import { withTimeout } from "./chat-message-pipeline";
import { logChatOperationalEvent } from "./chat-ops";
import { computeChatCostUsd, toChatUsageLike } from "./chat-telemetry";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ATTACHMENTS = 3;
const MAX_SUMMARY_CHARS = 600;
const DEGRADED_SUMMARY = "(image attached; analysis unavailable)";

type OwnedImageUpload = {
  id: string;
  filename: string;
  mimeType: string;
  storageKey: string;
};

type AttachmentGroundingResult = {
  promptBlock: string;
  visionOkCount: number;
  attachmentCount: number;
};

export function isChatAttachmentsEnabled(): boolean {
  return process.env.CHAT_ATTACHMENTS_ENABLED === "1";
}

function visionModel(): string {
  return (
    process.env.CHAT_VISION_MODEL?.trim() ||
    process.env.CHAT_MODEL_PRIMARY?.trim() ||
    "gpt-4o-mini"
  );
}

function groundingTimeoutMs(): number {
  const raw = Number(process.env.ATTACHMENT_GROUNDING_TIMEOUT_MS ?? "15000");
  return Number.isFinite(raw) && raw > 0 ? raw : 15_000;
}

/** Truncate factual vision text for the system prompt. */
export function truncateVisionSummary(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= MAX_SUMMARY_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_SUMMARY_CHARS - 1).trimEnd()}…`;
}

/**
 * Build the delimited prompt appendix (no vision; pure formatting).
 */
export function formatAttachedImagesBlock(
  items: Array<{ label: string; mimeType: string; summary: string }>,
): string {
  if (items.length === 0) return "";
  const lines = [
    "Attached images",
    "Grounding rules: summaries below come from server vision on private uploads (or a degraded placeholder). Do not invent pixel details beyond them.",
    "",
  ];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    lines.push(
      `- Attachment ${i + 1} (${item.label}, ${item.mimeType}): ${item.summary}`,
    );
  }
  return lines.join("\n").trimEnd();
}

/**
 * Ownership-check upload ids; only ready image mimes; max 3.
 */
async function resolveOwnedImageUploads(
  userId: string,
  uploadIds: string[] | undefined | null,
): Promise<
  ServiceResult<OwnedImageUpload[], "forbidden" | "validation" | "disabled">
> {
  if (!isChatAttachmentsEnabled()) {
    return err("disabled", "Chat attachments are disabled.");
  }
  const ids = [
    ...new Set((uploadIds ?? []).map((id) => id.trim()).filter(Boolean)),
  ];
  if (ids.length === 0) return ok([]);
  if (ids.length > MAX_ATTACHMENTS) {
    return err("validation", `At most ${MAX_ATTACHMENTS} attachments allowed.`);
  }

  const rows = await prisma.upload.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      userId: true,
      filename: true,
      mimeType: true,
      storageKey: true,
      status: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const owned: OwnedImageUpload[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row || row.userId !== userId) {
      return err("forbidden", "One or more attachments are not available.");
    }
    if (row.status !== "ready") {
      return err("validation", "Attachments must be ready uploads.");
    }
    if (!IMAGE_MIME.has(row.mimeType)) {
      return err(
        "validation",
        "Only JPEG, PNG, or WebP images can be attached.",
      );
    }
    owned.push({
      id: row.id,
      filename: row.filename,
      mimeType: row.mimeType,
      storageKey: row.storageKey,
    });
  }
  return ok(owned);
}

async function summarizeUploadWithVision(input: {
  bytes: Uint8Array;
  mimeType: string;
  userId: string;
  conversationId: string;
  fetchImpl: typeof fetch;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = visionModel();
  const base64 = Buffer.from(input.bytes).toString("base64");
  const dataUrl = `data:${input.mimeType};base64,${base64}`;

  const response = await input.fetchImpl(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this image briefly for an interior-design chat assistant: main subjects, materials/colors if visible, spatial layout cues. If the image is not interior/furniture related, say so. Factual only; no marketing.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (payload.usage) {
    const like = toChatUsageLike(payload.usage);
    void computeChatCostUsd(like, model);
    await recordCost({
      userId: input.userId,
      conversationId: input.conversationId,
      model,
      kind: "vision",
      usage: payload.usage,
    }).catch(() => {
      /* cost ledger must not fail grounding */
    });
  }
  if (!text) return null;
  return truncateVisionSummary(text);
}

/**
 * Fetch private upload bytes and produce a prompt grounding block.
 * Failures degrade per-image; never throws for vision errors.
 * Never logs image bytes or summary text.
 */
export async function groundOwnedUploads(input: {
  userId: string;
  conversationId: string;
  uploads: OwnedImageUpload[];
  fetchImpl?: typeof fetch;
  getObject?: (key: string) => Promise<{ bytes: Uint8Array; mimeType: string }>;
}): Promise<AttachmentGroundingResult> {
  if (input.uploads.length === 0) {
    return { promptBlock: "", visionOkCount: 0, attachmentCount: 0 };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const getObject =
    input.getObject ?? ((key: string) => getPrivateStorage().getObject(key));
  const timeoutMs = groundingTimeoutMs();
  const grounded = await Promise.all(
    input.uploads.map(async (upload) => {
      let summary = DEGRADED_SUMMARY;
      let visionOk = false;
      try {
        const object = await getObject(upload.storageKey);
        const mimeType = IMAGE_MIME.has(object.mimeType)
          ? object.mimeType
          : upload.mimeType;
        const visionText = await withTimeout(
          summarizeUploadWithVision({
            bytes: object.bytes,
            mimeType,
            userId: input.userId,
            conversationId: input.conversationId,
            fetchImpl,
          }),
          timeoutMs,
          "attachment_grounding",
        );
        if (visionText) {
          summary = visionText;
          visionOk = true;
        }
      } catch {
        summary = DEGRADED_SUMMARY;
      }
      return {
        label: upload.filename || upload.id,
        mimeType: upload.mimeType,
        summary,
        visionOk,
      };
    }),
  );
  const items = grounded.map((row) => ({
    label: row.label,
    mimeType: row.mimeType,
    summary: row.summary,
  }));
  const visionOkCount = grounded.filter((row) => row.visionOk).length;

  logChatOperationalEvent({
    event: "chat_attachment_grounding",
    userId: input.userId,
    conversationId: input.conversationId,
    proposalCount: input.uploads.length,
    errorCategory: visionOkCount > 0 ? "ok" : "degraded",
  });

  return {
    promptBlock: formatAttachedImagesBlock(items),
    visionOkCount,
    attachmentCount: input.uploads.length,
  };
}

/**
 * Resolve + ground when attachments are enabled and ids are present.
 * Returns null prompt when disabled or empty.
 */
export async function resolveAndGroundChatAttachments(input: {
  userId: string;
  conversationId: string;
  attachmentUploadIds?: string[] | null;
  fetchImpl?: typeof fetch;
  getObject?: (key: string) => Promise<{ bytes: Uint8Array; mimeType: string }>;
}): Promise<
  ServiceResult<AttachmentGroundingResult, "forbidden" | "validation">
> {
  if (!isChatAttachmentsEnabled()) {
    return ok({ promptBlock: "", visionOkCount: 0, attachmentCount: 0 });
  }
  const ids = input.attachmentUploadIds ?? [];
  if (ids.length === 0) {
    return ok({ promptBlock: "", visionOkCount: 0, attachmentCount: 0 });
  }
  const resolved = await resolveOwnedImageUploads(input.userId, ids);
  if (!resolved.ok) {
    if (resolved.error === "disabled") {
      return ok({ promptBlock: "", visionOkCount: 0, attachmentCount: 0 });
    }
    return err(resolved.error, resolved.message ?? "Invalid attachments.");
  }
  const grounded = await groundOwnedUploads({
    userId: input.userId,
    conversationId: input.conversationId,
    uploads: resolved.value,
    ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    ...(input.getObject ? { getObject: input.getObject } : {}),
  });
  return ok(grounded);
}
