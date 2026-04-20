import { auth } from "@/auth";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { OrdersView } from "@/components/eva-dashboard/account/views/orders-view";
import { getAccountOrders } from "@/lib/site/account/server/orders";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <ToastProvider>
        <AccountShell>
          <OrdersView orders={[]} signedOut />
        </AccountShell>
      </ToastProvider>
    );
  }

  const orders = await getAccountOrders(session.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <OrdersView orders={orders} />
      </AccountShell>
    </ToastProvider>
  );
}
