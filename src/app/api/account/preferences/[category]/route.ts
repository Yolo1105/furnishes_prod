import { z } from "zod";
import {
  removeManualPreference,
  setManualPreference,
} from "@/server/preferences/preference-service";
import {
  preferenceCategorySchema,
  preferenceValueSchema,
} from "@/server/preferences/preference-schema";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

type Params = { params: Promise<{ category: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { category: rawCategory } = await params;

  const categoryParsed = preferenceCategorySchema.safeParse(rawCategory);
  if (!categoryParsed.success) {
    return jsonError(400, "validation", "Unknown preference category.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const bodySchema = z.object({
    value: preferenceValueSchema,
    sourceConversationId: z.string().trim().min(1).max(64).optional(),
    sourceMessageId: z.string().trim().min(1).max(64).optional(),
  });
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid preference value.", {
      value: parsed.error.issues[0]?.message ?? "Invalid value.",
    });
  }

  return fromServiceResult(
    await setManualPreference({
      userId: session.user.id,
      category: categoryParsed.data,
      value: parsed.data.value,
      ...(parsed.data.sourceConversationId !== undefined
        ? { sourceConversationId: parsed.data.sourceConversationId }
        : {}),
      ...(parsed.data.sourceMessageId !== undefined
        ? { sourceMessageId: parsed.data.sourceMessageId }
        : {}),
    }),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const { category: rawCategory } = await params;

  const categoryParsed = preferenceCategorySchema.safeParse(rawCategory);
  if (!categoryParsed.success) {
    return jsonError(400, "validation", "Unknown preference category.");
  }

  return fromServiceResult(
    await removeManualPreference(session.user.id, categoryParsed.data),
  );
}
