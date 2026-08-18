import { z } from "zod";
import { createConversationRender } from "@/server/image-generation/restyle";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ conversationId: string }> };

const bodySchema = z.object({
  uploadId: z.string().min(1),
  styleDirection: z.string().max(500).optional(),
  clientRenderId: z.string().min(1).max(128).optional(),
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
    return jsonError(400, "validation", "Invalid render payload.");
  }

  return fromServiceResult(
    await createConversationRender({
      userId: session.user.id,
      conversationId,
      uploadId: parsed.data.uploadId,
      ...(parsed.data.styleDirection
        ? { styleDirection: parsed.data.styleDirection }
        : {}),
      ...(parsed.data.clientRenderId
        ? { clientRenderId: parsed.data.clientRenderId }
        : {}),
    }),
    {
      disabled: 503,
      not_found: 404,
      forbidden: 403,
      rate_limited: 429,
      cost_limit: 429,
      provider_unavailable: 503,
      storage_failed: 502,
      validation: 400,
    },
  );
}
