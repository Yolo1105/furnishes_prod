import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutPage } from "@/features/account/commerce/CheckoutPage";
import { requireCurrentSession } from "@/server/auth/session";
import { getCart } from "@/server/commerce/cart-service";
import { paymentProviderName } from "@/server/commerce/payment-provider";

export const dynamic = "force-dynamic";

export default async function AccountCheckoutRoute() {
  const session = await requireCurrentSession();
  const cart = await getCart(session.user);
  if (!cart.ok) notFound();
  return (
    <CheckoutPage
      initialCart={cart.value}
      paymentProvider={paymentProviderName()}
    />
  );
}

export const metadata: Metadata = {
  title: "Checkout",
};
