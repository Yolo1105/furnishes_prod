import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AddressLabel } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import type { Address } from "@/lib/site/commerce/types";

const PatchSchema = z.object({
  label: z.nativeEnum(AddressLabel).optional(),
  recipientName: z.string().min(1).max(200).optional(),
  phone: z.string().min(3).max(40).optional(),
  postalCode: z.string().min(3).max(20).optional(),
  street: z.string().min(1).max(500).optional(),
  unit: z.string().max(120).optional().nullable(),
  landmark: z.string().max(500).optional().nullable(),
  hasLiftAccess: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

function toAddressDto(a: {
  id: string;
  label: AddressLabel;
  recipientName: string;
  phone: string;
  postalCode: string;
  street: string;
  unit: string | null;
  landmark: string | null;
  hasLiftAccess: boolean;
  isDefault: boolean;
}): Address {
  return {
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
  };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser();
    const { id } = await ctx.params;
    const body = PatchSchema.parse(await req.json());

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Address not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({
        where: { id },
        data: {
          ...(body.label != null ? { label: body.label } : {}),
          ...(body.recipientName != null
            ? { recipientName: body.recipientName }
            : {}),
          ...(body.phone != null ? { phone: body.phone } : {}),
          ...(body.postalCode != null ? { postalCode: body.postalCode } : {}),
          ...(body.street != null ? { street: body.street } : {}),
          ...(body.unit !== undefined ? { unit: body.unit } : {}),
          ...(body.landmark !== undefined ? { landmark: body.landmark } : {}),
          ...(body.hasLiftAccess != null
            ? { hasLiftAccess: body.hasLiftAccess }
            : {}),
          ...(body.isDefault != null ? { isDefault: body.isDefault } : {}),
        },
      });
    });

    return NextResponse.json({ address: toAddressDto(updated) });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser();
    const { id } = await ctx.params;

    const existing = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Address not found." },
        { status: 404 },
      );
    }

    await prisma.address.delete({ where: { id } });

    const remaining = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      await prisma.address.update({
        where: { id: remaining[0]!.id },
        data: { isDefault: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
