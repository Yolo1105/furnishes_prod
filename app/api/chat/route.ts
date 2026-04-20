import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { handleChatPost } from "@/lib/eva/chat/post/handle-chat-post";

export const dynamic = "force-dynamic";

/** Re-export for consumers that read header names (tests / telemetry). */
export { CHAT_ROUTE_HEADER } from "@/lib/eva/chat/post/chat-route-headers";

/**
 * `/api/chat` — thin coordinator: delegate to `handleChatPost` and map DB errors.
 * Stages live under `lib/eva/chat/post/handle-chat-post.ts` and `lib/eva/chat/**`.
 */
export async function POST(req: Request) {
  try {
    return await handleChatPost(req);
  } catch (error: unknown) {
    return mapDbErrorToResponse(error, "api_chat_error");
  }
}
