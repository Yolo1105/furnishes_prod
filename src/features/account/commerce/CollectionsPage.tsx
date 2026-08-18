"use client";

import Link from "next/link";
import { useState } from "react";
import {
  accountRequest,
  isAccountApiError,
} from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import type { CartDto } from "@/server/commerce/cart-service";
import type { CatalogDto } from "@/server/commerce/catalog-service";

/**
 * Browse surface for the catalog, with the "Add to cart" action the approved
 * design places on a piece. Prices come from the server already formatted in the
 * shopper's currency, so this component never does money arithmetic.
 */
export function CollectionsPage({
  catalog,
  initialCartCount,
}: {
  catalog: CatalogDto;
  initialCartCount: number;
}) {
  const [cartCount, setCartCount] = useState(initialCartCount);
  const [busyVariant, setBusyVariant] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const categories = [...new Set(catalog.products.map((p) => p.category))];
  const [category, setCategory] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  }

  async function addToCart(variantId: string, label: string) {
    setBusyVariant(variantId);
    try {
      const cart = await accountRequest<CartDto>("/api/account/commerce/cart", {
        method: "POST",
        body: JSON.stringify({ variantId, quantity: 1 }),
      });
      setCartCount(cart.lines.reduce((sum, line) => sum + line.quantity, 0));
      flash(`Added ${label} to cart`);
    } catch (caught) {
      flash(
        isAccountApiError(caught) ? caught.message : "Could not add to cart.",
      );
    } finally {
      setBusyVariant(null);
    }
  }

  const shown = category
    ? catalog.products.filter((product) => product.category === category)
    : catalog.products;

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Orders & Account"
        title="Collections"
        subtitle="Pieces you can order, priced in your currency."
      />

      <div className="wf-tools">
        <button
          type="button"
          className={category === null ? "wf-chip on" : "wf-chip"}
          onClick={() => setCategory(null)}
        >
          All
        </button>
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            className={category === name ? "wf-chip on" : "wf-chip"}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
        <Link className="wf-chip" href="/account/cart">
          Cart · {cartCount}
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="wf-row__p">Nothing is available in your currency yet.</p>
      ) : (
        <div className="wf-list">
          {shown.flatMap((product) =>
            product.variants.map((variant) => (
              <div className="wf-row" key={variant.id}>
                <div className="wf-thumb" />
                <div className="wf-row__main">
                  <span className="wf-row__t">
                    {product.name} — {variant.name}
                  </span>
                  <span className="wf-row__p">
                    {product.category}
                    {variant.status === "made_to_order"
                      ? " · made to order"
                      : ""}
                  </span>
                </div>
                <span className="wf-row__m">{variant.priceLabel}</span>
                <button
                  type="button"
                  className="wf-btn"
                  disabled={busyVariant === variant.id}
                  onClick={() =>
                    void addToCart(
                      variant.id,
                      `${product.name} — ${variant.name}`,
                    )
                  }
                >
                  {busyVariant === variant.id ? "Adding…" : "Add to cart"}
                </button>
              </div>
            )),
          )}
        </div>
      )}

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
