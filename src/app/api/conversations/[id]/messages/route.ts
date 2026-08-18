import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlaygroundApiSession } from "@/server/canvas/playground-api-auth";
import {
  appendPlaygroundConversationTurn,
  listPlaygroundConversationMessages,
} from "@/server/canvas/playground-conversation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  const { id } = await params;
  const rows = await listPlaygroundConversationMessages(session.user.id, id);
  if (rows === "not_found") {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ messages: rows });
}

const AppendRequestZ = z.object({
  id: z.string().min(1).max(120),
  userText: z.string().max(20_000).default(""),
  response: z.string().max(20_000).default(""),
  displayTime: z.string().max(40).default(""),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = AppendRequestZ.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message.slice(0, 300) },
      { status: 400 },
    );
  }

  const { id: convoId } = await params;
  const result = await appendPlaygroundConversationTurn(
    session.user.id,
    convoId,
    {
      id: parsed.data.id,
      userText: parsed.data.userText,
      response: parsed.data.response,
      displayTime: parsed.data.displayTime,
      metadata: parsed.data.metadata,
    },
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: result.status },
    );
  }
  return NextResponse.json({ message: result.message }, { status: 201 });
}
