"use server";

import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import {
  coverHueFromProductId,
  revalidateAccountShortlistSurfaces,
} from "@/lib/eva/projects/shortlist-helpers";

export type ShortlistActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const AddSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1).max(200),
  productCategory: z.string().min(1).max(100),
  priceCents: z.number().int().nonnegative(),
  coverHue: z.number().int().min(0).max(359).optional(),
  projectId: z.string().optional(),
});

export async function addToShortlistAction(
  input: z.infer<typeof AddSchema>,
): Promise<ShortlistActionResult<{ id: string }>> {
  try {
    const { userId } = await requireUser();
    const parsed = AddSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid input" };

    const coverHue =
      parsed.data.coverHue ?? coverHueFromProductId(parsed.data.productId);

    const projectId = parsed.data.projectId || null;
    const dup = await prisma.shortlistItem.findFirst({
      where: { userId, productId: parsed.data.productId, projectId },
    });
    if (dup) {
      return {
        ok: false,
        error: "This product is already on your shortlist.",
      };
    }

    const item = await prisma.shortlistItem.create({
      data: {
        userId,
        productId: parsed.data.productId,
        productName: parsed.data.productName,
        productCategory: parsed.data.productCategory,
        priceCents: parsed.data.priceCents,
        coverHue,
        projectId,
        materials: [],
      },
    });
    revalidateAccountShortlistSurfaces({
      projectId,
      shortlistItemId: item.id,
    });
    return { ok: true, data: { id: item.id } };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Sign in to update your shortlist." };
    }
    console.error("[addToShortlist]", e);
    return { ok: false, error: "Could not save item. Try again." };
  }
}

export async function removeFromShortlistAction(
  itemId: string,
): Promise<ShortlistActionResult> {
  try {
    const { userId } = await requireUser();
    const row = await prisma.shortlistItem.findFirst({
      where: { id: itemId, userId },
      select: { projectId: true },
    });
    const result = await prisma.shortlistItem.deleteMany({
      where: { id: itemId, userId },
    });
    if (result.count === 0) return { ok: false, error: "Item not found" };
    revalidateAccountShortlistSurfaces({
      projectId: row?.projectId ?? undefined,
      shortlistItemId: itemId,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Sign in to update your shortlist." };
    }
    console.error("[removeFromShortlist]", e);
    return { ok: false, error: "Could not remove item. Try again." };
  }
}

export async function moveShortlistItemAction(
  itemId: string,
  projectId: string | null,
): Promise<ShortlistActionResult> {
  try {
    const { userId } = await requireUser();
    if (projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: projectId, userId },
        select: { id: true },
      });
      if (!proj) return { ok: false, error: "Project not found" };
    }
    const result = await prisma.shortlistItem.updateMany({
      where: { id: itemId, userId },
      data: { projectId },
    });
    if (result.count === 0) return { ok: false, error: "Item not found" };
    revalidateAccountShortlistSurfaces({
      projectId: projectId ?? undefined,
      shortlistItemId: itemId,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Sign in to update your shortlist." };
    }
    console.error("[moveShortlistItem]", e);
    return { ok: false, error: "Could not move item. Try again." };
  }
}
