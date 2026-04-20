import { auth } from "@/auth";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { DeliveriesView } from "@/components/eva-dashboard/account/views/deliveries-view";
import { getAccountDeliveries } from "@/lib/site/account/server/deliveries";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <ToastProvider>
        <AccountShell>
          <DeliveriesView
            data={{ trackedDeliveries: [], pendingDeliveryOrders: [] }}
            signedOut
          />
        </AccountShell>
      </ToastProvider>
    );
  }

  const data = await getAccountDeliveries(session.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <DeliveriesView data={data} />
      </AccountShell>
    </ToastProvider>
  );
}
