import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionsPage } from "@/features/account/commerce/CollectionsPage";
import { requireCurrentSession } from "@/server/auth/session";
import { getCart } from "@/server/commerce/cart-service";
import { listCatalog } from "@/server/commerce/catalog-service";
import { settlementCurrency } from "@/server/commerce/commerce-config";

export const dynamic = "force-dynamic";

/**
 * Catalog browse surface. The approved design hangs "Add to cart" off a piece in
 * Collections, so that is where buying starts.
 */
export default async function AccountCollectionsRoute() {
  const session = await requireCurrentSession();
  const [catalog, cart] = await Promise.all([
    listCatalog(settlementCurrency(session.user)),
    getCart(session.user),
  ]);
  if (!catalog.ok || !cart.ok) notFound();

  return (
    <CollectionsPage
      catalog={catalog.value}
      initialCartCount={cart.value.lines.reduce(
        (sum, line) => sum + line.quantity,
        0,
      )}
    />
  );
}

export const metadata: Metadata = {
  title: "Collections",
};
