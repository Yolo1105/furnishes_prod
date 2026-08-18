import { redirect } from "next/navigation";
import { requireCurrentSession } from "@/server/auth/session";
import {
  createConversation,
  listConversations,
} from "@/server/conversations/service";

export const dynamic = "force-dynamic";

/**
 * Workspace Chat [03] entry — open the latest thread, or start a new one.
 * Matches the prototype Chat tab (chat workspace), not the Conversations list.
 */
export default async function AccountChatEntryRoute() {
  const session = await requireCurrentSession();
  const listed = await listConversations(session.user.id, { limit: 1 });
  const latest = listed.items[0];
  if (latest) {
    redirect(`/account/conversations/${latest.id}`);
  }
  const created = await createConversation(session.user.id);
  if (!created.ok) {
    redirect("/account/conversations");
  }
  redirect(`/account/conversations/${created.value.id}`);
}
