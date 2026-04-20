import { auth } from "@/auth";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ReturnsView } from "@/components/eva-dashboard/account/views/returns-view";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import {
  getAccountReturnsState,
  type AccountReturnsState,
} from "@/lib/site/account/server/returns";

const emptyReturns: AccountReturnsState = {
  openThreads: [],
  closedThreads: [],
  supportHref: accountPaths.supportHelp,
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <ToastProvider>
        <AccountShell>
          <ReturnsView state={emptyReturns} signedOut />
        </AccountShell>
      </ToastProvider>
    );
  }

  const state = await getAccountReturnsState(session.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <ReturnsView state={state} />
      </AccountShell>
    </ToastProvider>
  );
}
