import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ActivityView } from "@/components/eva-dashboard/account/views/activity-view";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountActivity } from "@/lib/site/account/server/activity";

export default async function Page() {
  const resolved = await resolveSession();
  const initial = await getAccountActivity(resolved.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <ActivityView initial={initial} />
      </AccountShell>
    </ToastProvider>
  );
}
