import { z } from "zod";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";
import { generateConversationBrainstorm } from "@/server/conversations/chat-side-features";

type Params = { params: Promise<{ conversationId: string }> };

const bodySchema = z
  .object({
    mode: z.enum(["full", "copilot"]).optional(),
  })
  .passthrough();

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { conversationId } = await params;

  let mode: "full" | "copilot" | undefined;
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (parsed.success) mode = parsed.data.mode;
  } catch {
    // Empty body is fine for brainstorm.
  }

  const result = await generateConversationBrainstorm({
    userId: session.user.id,
    conversationId,
    ...(mode ? { mode } : {}),
  });
  if (!result.ok && result.error === "disabled") {
    return jsonError(503, "disabled", result.message ?? "Disabled.");
  }
  return fromServiceResult(result, { disabled: 503 });
}
