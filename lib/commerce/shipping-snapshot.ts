import type { Prisma } from "@prisma/client";
import { COMMERCE_DEFAULT_COUNTRY_CODE } from "@/lib/commerce/region";

type AddressRow = {
  label: string;
  recipientName: string;
  phone: string;
  postalCode: string;
  street: string;
  unit: string | null | undefined;
  landmark: string | null | undefined;
  hasLiftAccess?: boolean | null;
};

/** Immutable JSON stored on `Order.shippingSnapshot` at placement time. */
export function addressToShippingSnapshot(
  address: AddressRow,
): Prisma.InputJsonValue {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    postalCode: address.postalCode,
    country: COMMERCE_DEFAULT_COUNTRY_CODE,
    line1: address.street,
    line2: address.unit ?? undefined,
    landmark: address.landmark ?? undefined,
    hasLiftAccess: address.hasLiftAccess ?? true,
  };
}
