import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartPage } from "@/features/account/commerce/CartPage";
import { requireCurrentSession } from "@/server/auth/session";
import { getCart } from "@/server/commerce/cart-service";

export const dynamic = "force-dynamic";

export default async function AccountCartRoute() {
  const session = await requireCurrentSession();
  const cart = await getCart(session.user);
  // With commerce off the storefront should not exist at all, rather than
  // render an empty cart that implies buying is coming.
  if (!cart.ok) notFound();
  return <CartPage initialCart={cart.value} />;
}

export const metadata: Metadata = {
  title: "Cart",
};
