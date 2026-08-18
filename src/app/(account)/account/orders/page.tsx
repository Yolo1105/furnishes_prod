import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrdersPage } from "@/features/account/commerce/OrdersPage";
import { requireCurrentSession } from "@/server/auth/session";
import { listOrders } from "@/server/commerce/order-service";

export const dynamic = "force-dynamic";

/**
 * `searchParams` carries the return from a hosted payment. It is read here
 * rather than with `useSearchParams` so the client component stays a plain
 * function of its props.
 */
export default async function AccountOrdersRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireCurrentSession();
  const orders = await listOrders(session.user.id);
  if (!orders.ok) notFound();

  const params = await searchParams;
  const outcome = typeof params.checkout === "string" ? params.checkout : null;
  const orderNumber = typeof params.order === "string" ? params.order : null;

  return (
    <OrdersPage
      initialOrders={orders.value.orders}
      // Anything other than the two known values is ignored: this is a URL the
      // shopper can edit, and it must never be echoed back to them.
      checkoutOutcome={
        outcome === "success" || outcome === "cancelled" ? outcome : null
      }
      checkoutOrderNumber={orderNumber}
    />
  );
}

export const metadata: Metadata = {
  title: "Orders",
};
