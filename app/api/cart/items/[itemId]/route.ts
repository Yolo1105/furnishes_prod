import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { decorateCartLines } from "@/lib/commerce/cart-decoration";

const PatchSchema = z.object({
  qty: z.number().int().min(1).max(99).optional(),
  savedForLater: z.boolean().optional(),
});

/**
 * PATCH /api/cart/items/:itemId — update quantity or saved-for-later.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
) {
  try {
    const { userId } = await requireUser();
    const { itemId } = await ctx.params;
    const body = PatchSchema.parse(await req.json());

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cart) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "No cart." },
        { status: 404 },
      );
    }

    const row = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!row) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Line not found." },
        { status: 404 },
      );
    }

    await prisma.cartItem.update({
      where: { id: row.id },
      data: {
        ...(body.qty != null ? { qty: body.qty } : {}),
        ...(body.savedForLater != null
          ? { savedForLater: body.savedForLater }
          : {}),
      },
    });

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

/**
 * DELETE /api/cart/items/:itemId — remove a line.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
) {
  try {
    const { userId } = await requireUser();
    const { itemId } = await ctx.params;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!cart) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "No cart." },
        { status: 404 },
      );
    }

    const row = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!row) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Line not found." },
        { status: 404 },
      );
    }

    await prisma.cartItem.delete({ where: { id: row.id } });

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
