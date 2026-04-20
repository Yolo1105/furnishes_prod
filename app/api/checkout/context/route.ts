import { NextResponse } from "next/server";
import { getUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { isCommerceBackendEnabled } from "@/lib/site/commerce/server-flags";
import { decorateCartLines } from "@/lib/commerce/cart-decoration";
import type { Address, Cart } from "@/lib/site/commerce/types";

/**
 * GET /api/checkout/context
 *
 * Signed-in only: real addresses and cart lines. Unauthenticated callers receive 401.
 */
export async function GET() {
  try {
    const commerceBackendEnabled = isCommerceBackendEnabled();
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "UNAUTHENTICATED",
          message: "Sign in to continue checkout.",
          commerceBackendEnabled,
        },
        { status: 401 },
      );
    }

    const [addresses, cartRow] = await Promise.all([
      prisma.address.findMany({
        where: { userId: user.userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      prisma.cart.findUnique({
        where: { userId: user.userId },
        include: { items: { where: { savedForLater: false } } },
      }),
    ]);

    const lines = cartRow?.items ?? [];
    const cartItems = await decorateCartLines(user.userId, lines);

    const cart: Cart | null = cartRow
      ? {
          items: cartItems,
          shippingAddressId: null,
          giftCode: cartRow.giftCode,
          giftDiscountCents: cartRow.giftDiscountCents,
        }
      : null;

    const addrOut: Address[] = addresses.map((a) => ({
      id: a.id,
      label: a.label as Address["label"],
      recipientName: a.recipientName,
      phone: a.phone,
      postalCode: a.postalCode,
      street: a.street,
      unit: a.unit ?? undefined,
      landmark: a.landmark ?? undefined,
      isDefault: a.isDefault,
      hasLiftAccess: a.hasLiftAccess,
    }));

    return NextResponse.json({
      authenticated: true,
      commerceBackendEnabled,
      addresses: addrOut,
      cart,
    });
  } catch (e) {
    return apiError(e);
  }
}
