import { z } from "zod";
import { acceptPreferenceProposal } from "@/server/preferences/preference-service";
import { preferenceValueSchema } from "@/server/preferences/preference-schema";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ proposalId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { proposalId } = await params;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const parsed = z
    .object({
      value: preferenceValueSchema.optional(),
    })
    .safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid accept payload.");
  }

  return fromServiceResult(
    await acceptPreferenceProposal({
      userId: session.user.id,
      proposalId,
      ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
    }),
  );
}
