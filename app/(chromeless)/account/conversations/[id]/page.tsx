import { notFound } from "next/navigation";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ConversationDetailView } from "@/components/eva-dashboard/account/views/conversation-detail-view";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountConversationDetail } from "@/lib/site/account/server/conversations";

type Params = { id: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const resolved = await resolveSession();
  const detail = await getAccountConversationDetail(resolved.user.id, id);
  if (!detail) notFound();

  return (
    <ToastProvider>
      <AccountShell>
        <ConversationDetailView detail={detail} />
      </AccountShell>
    </ToastProvider>
  );
}
