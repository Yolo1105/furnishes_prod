import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatPage } from "@/features/account/conversations/ChatPage";
import { getChatBootstrap } from "@/server/conversations/chat-bootstrap";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ conversationId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const session = await requireCurrentSession();
  const { conversationId } = await params;
  const result = await getChatBootstrap(session.user.id, conversationId);
  if (!result.ok) return { title: "Conversation" };
  return { title: result.value.conversation.title?.trim() || "Conversation" };
}

export default async function AccountConversationRoute({ params }: Params) {
  const session = await requireCurrentSession();
  const { conversationId } = await params;
  const result = await getChatBootstrap(session.user.id, conversationId);
  if (!result.ok) notFound();
  return <ChatPage initial={result.value} />;
}
