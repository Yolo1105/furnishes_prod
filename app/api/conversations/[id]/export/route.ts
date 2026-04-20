import { generateObject, zodSchema } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import {
  getOpenAIKey,
  withFallback,
  openai,
  OPENAI_PRIMARY_MODEL,
  OPENAI_FALLBACK_MODEL,
  computeCost,
  toUsageLike,
} from "@/lib/eva/core/openai";
import { recordCost } from "@/lib/eva/core/cost-logger";

export const dynamic = "force-dynamic";

const ExportSummarySchema = z.object({
  summary: z.string().describe("2-3 sentence project summary"),
  key_decisions: z.array(z.string()).describe("Main choices made"),
  open_questions: z.array(z.string()).describe("1-3 open questions"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error, status } = await requireConversationAccess(id, req);
  if (error) {
    return apiError(
      status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      error,
      status,
    );
  }
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "markdown").toLowerCase();
  const validFormat =
    format === "json" || format === "markdown" ? format : "markdown";
  const includeMessages = url.searchParams.get("include_messages") !== "false";

  const [prefs, changes, messages] = await Promise.all([
    prisma.preference.findMany({ where: { conversationId: id } }),
    prisma.preferenceChange.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const preferences: Record<string, string> = {};
  for (const p of prefs) preferences[p.field] = p.value;
  const messagesData = messages.map((m: { role: string; content: string }) => ({
    role: m.role,
    content: m.content,
  }));
  const changeHistory = changes.map(
    (c: {
      field: string;
      oldValue: string | null;
      newValue: string | null;
      changeType: string;
      createdAt: Date;
    }) => ({
      field: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      changeType: c.changeType,
      createdAt: c.createdAt.toISOString(),
    }),
  );

  if (validFormat === "json") {
    const payload = includeMessages
      ? { preferences, changeHistory, messages: messagesData }
      : { preferences, changeHistory };
    const body = JSON.stringify(payload, null, 2);
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="conversation-${id.slice(-8)}.json"`,
      },
    });
  }

  let summary = "";
  let key_decisions: string[] = [];
  let open_questions: string[] = [];
  if (
    getOpenAIKey() &&
    (Object.keys(preferences).length > 0 || messagesData.length > 0)
  ) {
    try {
      const prefsStr = JSON.stringify(preferences, null, 0);
      const recent = messagesData
        .slice(-20)
        .map(
          (m: { role: string; content: string }) =>
            `${m.role}: ${(m.content ?? "").slice(0, 150)}`,
        )
        .join("\n");
      const exportPrompt = `Preferences: ${prefsStr}\nRecent messages:\n${recent}\n\nRespond with JSON: "summary" (2-3 sentences), "key_decisions" (array of short strings), "open_questions" (1-3 questions). Output only JSON.`;
      const exportResult = await withFallback(
        () =>
          generateObject({
            model: openai(OPENAI_PRIMARY_MODEL),
            schema: zodSchema(ExportSummarySchema),
            prompt: exportPrompt,
            maxRetries: 2,
          }),
        () =>
          generateObject({
            model: openai(OPENAI_FALLBACK_MODEL),
            schema: zodSchema(ExportSummarySchema),
            prompt: exportPrompt,
            maxRetries: 1,
          }),
      );
      const object = exportResult.object;
      summary = object.summary ?? "";
      key_decisions = object.key_decisions ?? [];
      open_questions = object.open_questions ?? [];
      if (exportResult.usage) {
        const u = toUsageLike(exportResult.usage);
        const costUsd = computeCost(u, OPENAI_PRIMARY_MODEL);
        void recordCost(
          id,
          OPENAI_PRIMARY_MODEL,
          u.promptTokens ?? 0,
          u.completionTokens ?? 0,
          costUsd,
        );
      }
    } catch {
      // leave summary/decisions/questions empty
    }
  }

  const parts: string[] = ["# Project Export\n\n"];
  if (summary) {
    parts.push("## Summary\n\n");
    parts.push(summary + "\n\n");
  }
  if (key_decisions.length > 0) {
    parts.push("## Key decisions\n\n");
    for (const d of key_decisions) parts.push(`- ${d}\n`);
    parts.push("\n");
  }
  if (open_questions.length > 0) {
    parts.push("## Open questions\n\n");
    for (const q of open_questions) parts.push(`- ${q}\n`);
    parts.push("\n");
  }
  parts.push("## Preferences\n\n```json\n");
  parts.push(JSON.stringify(preferences, null, 2));
  parts.push("\n```\n\n");
  parts.push("## Preference change history\n\n");
  for (const c of changeHistory) {
    parts.push(
      `- **${c.field}**: ${c.oldValue ?? "(none)"} → ${c.newValue} (${c.changeType})\n`,
    );
  }
  if (includeMessages) {
    parts.push("\n## Conversation\n\n");
    for (const m of messagesData) {
      parts.push(`**${m.role}**: ${(m.content || "").replace(/\n/g, " ")}\n\n`);
    }
  }
  const body = parts.join("");
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="conversation-${id.slice(-8)}.md"`,
    },
  });
}
