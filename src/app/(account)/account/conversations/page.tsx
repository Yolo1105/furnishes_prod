import type { Metadata } from "next";
import { ConversationsPage } from "@/features/account/conversations/ConversationsPage";
import { listConversations } from "@/server/conversations/service";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountConversationsRoute() {
  const session = await requireCurrentSession();
  const items = (await listConversations(session.user.id)).items;
  return <ConversationsPage initialItems={items} />;
}

export const metadata: Metadata = {
  title: "Conversations",
};
