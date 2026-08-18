import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlaygroundApiSession } from "@/server/canvas/playground-api-auth";
import {
  deletePlaygroundConversation,
  renamePlaygroundConversation,
} from "@/server/canvas/playground-conversation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RenameRequestZ = z.object({
  title: z.string().min(1).max(200),
});

export async function PATCH(
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
  const parsed = RenameRequestZ.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.message.slice(0, 300) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await renamePlaygroundConversation(
    session.user.id,
    id,
    parsed.data.title,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: result.status },
    );
  }
  return NextResponse.json({ conversation: result.conversation });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, response } = await requirePlaygroundApiSession();
  if (!session) return response;

  const { id } = await params;
  const ok = await deletePlaygroundConversation(session.user.id, id);
  if (!ok) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
