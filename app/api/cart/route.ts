import { NextResponse } from "next/server";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { decorateCartLines } from "@/lib/commerce/cart-decoration";
import type { Cart } from "@/lib/site/commerce/types";

/**
 * GET /api/cart — signed-in user's cart lines (decorated for UI).
 */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const cartRow = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { addedAt: "asc" } } },
    });
    if (!cartRow) {
      return NextResponse.json({
        cart: {
          items: [],
          giftCode: null,
          giftDiscountCents: 0,
        } satisfies Cart,
      });
    }

    const items = await decorateCartLines(userId, cartRow.items);

    const cart: Cart = {
      items,
      shippingAddressId: null,
      giftCode: cartRow.giftCode,
      giftDiscountCents: cartRow.giftDiscountCents,
    };

    return NextResponse.json({ cart });
  } catch (e) {
    return apiError(e);
  }
}
