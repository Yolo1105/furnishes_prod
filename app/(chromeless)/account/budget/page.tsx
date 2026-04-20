import { auth } from "@/auth";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { BudgetView } from "@/components/eva-dashboard/account/views/budget-view";
import { getAccountBudget } from "@/lib/site/account/server/budget";

export default async function Page() {
  const session = await auth();
  const snapshot =
    session?.user?.id != null ? await getAccountBudget(session.user.id) : null;

  return (
    <ToastProvider>
      <AccountShell>
        <BudgetView initial={snapshot} />
      </AccountShell>
    </ToastProvider>
  );
}
