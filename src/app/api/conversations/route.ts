import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlaygroundApiSession } from "@/server/canvas/playground-api-auth";
import {
  createPlaygroundConversation,
  listPlaygroundConversations,
} from "@/server/canvas/playground-conversation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateRequestZ = z.object({
  id: z.string().min(1).max(120),
  projectId: z.string().min(1).max(120),
  title: z.string().min(1).max(200).default("Conversation 1"),
});

export async function GET(req: Request) {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const rows = await listPlaygroundConversations(session.user.id, projectId);
  if (rows === "forbidden") {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ conversations: rows });
}

export async function POST(req: Request) {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateRequestZ.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message.slice(0, 300) },
      { status: 400 },
    );
  }

  const result = await createPlaygroundConversation(session.user.id, {
    id: parsed.data.id,
    projectId: parsed.data.projectId,
    title: parsed.data.title,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: result.status });
  }
  return NextResponse.json(
    { conversation: result.conversation },
    { status: 201 },
  );
}
