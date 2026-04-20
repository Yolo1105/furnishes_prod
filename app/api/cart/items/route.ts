import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { getValidatedUnitPriceCents } from "@/lib/commerce/catalog-price";
import { decorateCartLines } from "@/lib/commerce/cart-decoration";
import { Currency } from "@prisma/client";

const BodySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qty: z.number().int().min(1).max(99),
  unitPriceCents: z.number().int().positive(),
});

/**
 * POST /api/cart/items — add or merge a line (signed-in).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = BodySchema.parse(await req.json());

    const authoritative = getValidatedUnitPriceCents(body.productId);
    if (authoritative === null) {
      return NextResponse.json(
        { error: "UNKNOWN_PRODUCT", message: "Product is not in the catalog." },
        { status: 400 },
      );
    }
    if (body.unitPriceCents !== authoritative) {
      return NextResponse.json(
        {
          error: "PRICE_MISMATCH",
          message: "Price is out of date. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const variantKey = body.variantId ?? null;
    const existing = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: body.productId,
        variantId: variantKey,
        savedForLater: false,
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + body.qty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: body.productId,
          variantId: variantKey,
          qty: body.qty,
          unitPriceCents: authoritative,
          currency: Currency.SGD,
        },
      });
    }

    const lines = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
      orderBy: { addedAt: "asc" },
    });
    const items = await decorateCartLines(userId, lines);
    return NextResponse.json({ items });
  } catch (e) {
    return apiError(e);
  }
}
