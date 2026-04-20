import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { PrivacyView } from "@/components/eva-dashboard/account/views/privacy-view";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountConsents } from "@/lib/site/account/server/privacy";

export default async function Page() {
  const resolved = await resolveSession();
  const consents = await getAccountConsents(resolved.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <PrivacyView consents={consents} />
      </AccountShell>
    </ToastProvider>
  );
}
