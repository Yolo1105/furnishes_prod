import dynamic from "next/dynamic";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  PageSkeleton,
  ToastProvider,
} from "@/components/eva-dashboard/account/shared";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountConversations } from "@/lib/site/account/server/conversations";

const ConversationsView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/conversations-view").then(
      (m) => ({ default: m.ConversationsView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="DIALOGUE" cards={4} />,
  },
);

export default async function Page() {
  const resolved = await resolveSession();
  const initial = await getAccountConversations(resolved.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <ConversationsView initial={initial} />
      </AccountShell>
    </ToastProvider>
  );
}
