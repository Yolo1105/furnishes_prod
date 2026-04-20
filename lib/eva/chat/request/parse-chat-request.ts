import { z } from "zod";
import {
  ChatAttachmentSchema,
  ClientSurfaceSchema,
} from "@/lib/eva/api/chat-attachment";
import { ClientMessageSourceSchema } from "@/lib/eva/api/client-message-meta";

export const buildChatPostBodySchema = (maxMessageLength: number) =>
  z.object({
    conversationId: z.string().optional(),
    assistantId: z.string().optional(),
    projectId: z.string().optional(),
    message: z.string().min(1).max(maxMessageLength),
    preferences: z.record(z.string(), z.string()).optional(),
    messageSource: ClientMessageSourceSchema.optional(),
    skipExtraction: z.boolean().optional(),
    clientAttemptId: z.string().max(128).optional(),
    priorChatRequestId: z.string().max(128).optional(),
    studioSnapshot: z.unknown().optional(),
    clientSurface: ClientSurfaceSchema.optional(),
    attachments: z.array(ChatAttachmentSchema).max(8).optional(),
  });

export type ParsedChatPostBody = z.infer<
  ReturnType<typeof buildChatPostBodySchema>
>;
