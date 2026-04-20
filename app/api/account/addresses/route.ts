import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AddressLabel } from "@prisma/client";
import { requireUser } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/api/error";
import { ACCOUNT_ADDRESS_LIMIT } from "@/lib/commerce/constants";
import type { Address } from "@/lib/site/commerce/types";

const BodySchema = z.object({
  label: z.nativeEnum(AddressLabel),
  recipientName: z.string().min(1).max(200),
  phone: z.string().min(3).max(40),
  postalCode: z.string().min(3).max(20),
  street: z.string().min(1).max(500),
  unit: z.string().max(120).optional(),
  landmark: z.string().max(500).optional(),
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

export async function GET() {
  try {
    const { userId } = await requireUser();
    const rows = await prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({
      addresses: rows.map(toAddressDto),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const body = BodySchema.parse(await req.json());

    const count = await prisma.address.count({ where: { userId } });
    if (count >= ACCOUNT_ADDRESS_LIMIT) {
      return NextResponse.json(
        {
          error: "LIMIT",
          message: `You can save up to ${ACCOUNT_ADDRESS_LIMIT} addresses.`,
        },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          userId,
          label: body.label,
          recipientName: body.recipientName,
          phone: body.phone,
          postalCode: body.postalCode,
          street: body.street,
          unit: body.unit,
          landmark: body.landmark,
          hasLiftAccess: body.hasLiftAccess ?? true,
          isDefault: body.isDefault ?? count === 0,
        },
      });
    });

    return NextResponse.json({ address: toAddressDto(created) });
  } catch (e) {
    return apiError(e);
  }
}
