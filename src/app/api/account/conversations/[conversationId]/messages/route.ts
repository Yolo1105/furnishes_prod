import { z } from "zod";
import { sendConversationMessage } from "@/server/conversations/service";
import { streamConversationMessageResponse } from "@/server/conversations/chat-stream-service";
import { pageContextSchema } from "@/server/conversations/chat-copilot";
import { CHAT_MESSAGE_SOURCES } from "@/server/preferences/preference-types";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ conversationId: string }> };

const bodySchema = z.object({
  content: z.string(),
  clientMessageId: z.string().min(1).max(128),
  stream: z.boolean().optional(),
  mode: z.enum(["full", "copilot"]).optional(),
  pageContext: pageContextSchema.optional(),
  messageSource: z
    .enum(
      CHAT_MESSAGE_SOURCES as [
        (typeof CHAT_MESSAGE_SOURCES)[number],
        ...(typeof CHAT_MESSAGE_SOURCES)[number][],
      ],
    )
    .optional(),
  attachmentUploadIds: z.array(z.string().min(1)).max(3).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid message payload.");
  }

  const pageContext = parsed.data.pageContext
    ? {
        surface: parsed.data.pageContext.surface,
        ...(parsed.data.pageContext.snapshot
          ? { snapshot: parsed.data.pageContext.snapshot }
          : {}),
      }
    : undefined;

  if (parsed.data.stream) {
    return streamConversationMessageResponse({
      userId: session.user.id,
      conversationId,
      content: parsed.data.content,
      messageSourceRaw: parsed.data.messageSource ?? "typed",
      clientMessageIdRaw: parsed.data.clientMessageId,
      signal: request.signal,
      userEmail: session.user.email ?? null,
      ...(parsed.data.attachmentUploadIds
        ? { attachmentUploadIds: parsed.data.attachmentUploadIds }
        : {}),
      ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
      ...(pageContext ? { pageContext } : {}),
    });
  }

  return fromServiceResult(
    await sendConversationMessage(
      session.user.id,
      conversationId,
      parsed.data.content,
      parsed.data.messageSource ?? "typed",
      parsed.data.clientMessageId,
      {
        userEmail: session.user.email ?? null,
        ...(parsed.data.attachmentUploadIds
          ? { attachmentUploadIds: parsed.data.attachmentUploadIds }
          : {}),
        ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
        ...(pageContext ? { pageContext } : {}),
      },
    ),
  );
}
