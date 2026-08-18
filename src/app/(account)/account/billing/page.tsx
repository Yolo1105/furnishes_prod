import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BillingPage } from "@/features/account/commerce/BillingPage";
import { requireCurrentSession } from "@/server/auth/session";
import { listOrders } from "@/server/commerce/order-service";

export const dynamic = "force-dynamic";

export default async function AccountBillingRoute() {
  const session = await requireCurrentSession();
  const orders = await listOrders(session.user.id);
  if (!orders.ok) notFound();
  return <BillingPage orders={orders.value.orders} />;
}

export const metadata: Metadata = {
  title: "Billing",
};
