import { createHelpRequest } from "@/server/account/settings";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const record = (body ?? {}) as {
    category?: string;
    message?: string;
    context?: string;
  };
  if (!record.message?.trim()) {
    return jsonError(400, "validation", "Message is required.", {
      message: "Message is required.",
    });
  }
  return fromServiceResult(
    await createHelpRequest(session.user.id, {
      category: record.category ?? "general",
      message: record.message,
      ...(record.context !== undefined ? { context: record.context } : {}),
    }),
  );
}
