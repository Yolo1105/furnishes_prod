import {
  createImageGeneration,
  listImageGenerations,
} from "@/server/image-generation/image-generation-service";
import { fromServiceResult, jsonOk, requireApiSession } from "@/server/http";

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  const cursor = new URL(request.url).searchParams.get("cursor");
  const result = await listImageGenerations(session.user.id, cursor);
  return jsonOk(result);
}

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fromServiceResult({
      ok: false as const,
      error: "invalid_prompt" as const,
      message: "Invalid JSON body.",
    });
  }
  const result = await createImageGeneration(session.user.id, body);
  return fromServiceResult(result);
}
