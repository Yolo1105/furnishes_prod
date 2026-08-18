import { z } from "zod";
import {
  getAssistantPersonaState,
  setActiveAssistantPersona,
} from "@/server/conversations/persona-service";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return fromServiceResult(await getAssistantPersonaState(session.user.id));
}

const patchSchema = z.object({
  assistantId: z.string().trim().min(1).max(64),
});

export async function PATCH(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid assistant persona.", {
      assistantId: "Choose one of the four Eva personas.",
    });
  }

  return fromServiceResult(
    await setActiveAssistantPersona(session.user.id, parsed.data.assistantId),
  );
}
