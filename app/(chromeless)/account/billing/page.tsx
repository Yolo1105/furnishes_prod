import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { BillingView } from "@/components/eva-dashboard/account/views/billing-view";
import { resolveSession } from "@/lib/auth/resolve-session";
import {
  getAccountInvoices,
  getAccountTokenUsage,
} from "@/lib/site/account/server/billing";

export default async function Page() {
  const resolved = await resolveSession();
  const [invoices, usage] = await Promise.all([
    getAccountInvoices(resolved.user.id),
    getAccountTokenUsage(resolved.user.id),
  ]);

  return (
    <ToastProvider>
      <AccountShell>
        <BillingView invoices={invoices} usage={usage} />
      </AccountShell>
    </ToastProvider>
  );
}
