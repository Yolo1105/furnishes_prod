/**
 * Catalog reads. Flag COMMERCE_ENABLED.
 *
 * A variant is only offered when it carries an authored price in the shopper's
 * settlement currency; there is no runtime FX fallback, so an unpriced market
 * simply shows nothing rather than a converted guess.
 */

import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { formatMoney, type Currency } from "@/lib/commerce/money";
import { isCommerceEnabled } from "./commerce-config";

type CatalogVariantDto = {
  id: string;
  sku: string;
  name: string;
  status: string;
  priceCents: number;
  priceLabel: string;
};

type CatalogProductDto = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string;
  description: string | null;
  variants: CatalogVariantDto[];
};

export type CatalogDto = {
  currency: Currency;
  products: CatalogProductDto[];
};

type CatalogError = "commerce_disabled";

export async function listCatalog(
  currency: Currency,
  options?: { category?: string },
): Promise<ServiceResult<CatalogDto, CatalogError>> {
  if (!isCommerceEnabled()) {
    return err("commerce_disabled", "The store is not available yet.");
  }

  const rows = await prisma.product.findMany({
    where: {
      status: "active",
      ...(options?.category ? { category: options.category } : {}),
      // Only surface products with at least one variant priced in this market.
      variants: { some: { prices: { some: { currency } } } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      category: true,
      description: true,
      variants: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
          prices: { where: { currency }, select: { amountCents: true } },
        },
      },
    },
  });

  const products: CatalogProductDto[] = rows
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
      variants: product.variants.flatMap((variant) => {
        const price = variant.prices[0];
        if (!price) return [];
        return [
          {
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            status: variant.status,
            priceCents: price.amountCents,
            priceLabel: formatMoney(price.amountCents, currency),
          },
        ];
      }),
    }))
    .filter((product) => product.variants.length > 0);

  return ok({ currency, products });
}

type PurchasableVariant = {
  id: string;
  sku: string;
  name: string;
  productName: string;
  amountCents: number;
};

/**
 * Resolves a variant for a write path (add to cart). Returns the authored price
 * in the given currency, so callers never have to trust a client-sent amount.
 */
export async function findPurchasableVariant(
  variantId: string,
  currency: Currency,
): Promise<PurchasableVariant | null> {
  const variant = await prisma.variant.findFirst({
    where: {
      id: variantId,
      status: { not: "out_of_stock" },
      product: { status: "active" },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      product: { select: { name: true } },
      prices: { where: { currency }, select: { amountCents: true } },
    },
  });
  const price = variant?.prices[0];
  if (!variant || !price) return null;
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    productName: variant.product.name,
    amountCents: price.amountCents,
  };
}
