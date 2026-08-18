/**
 * Order arithmetic, in one place.
 *
 * The cart display and order creation must both call this. If they computed
 * totals separately, a user could be charged something other than the figure
 * they approved — the classic checkout bug.
 */

import { lineTotalCents, percentOfCents } from "@/lib/commerce/money";
import {
  freeShippingThresholdCents,
  shippingFlatCents,
  taxLabel,
  taxPercent,
} from "./commerce-config";

type TotalsLine = { unitPriceCents: number; quantity: number };

export type Totals = {
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  taxLabel: string;
  taxPercent: number;
};

export function computeTotals(lines: TotalsLine[]): Totals {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + lineTotalCents(line.unitPriceCents, line.quantity),
    0,
  );

  const threshold = freeShippingThresholdCents();
  const shippingCents =
    lines.length === 0 || (threshold > 0 && subtotalCents >= threshold)
      ? 0
      : shippingFlatCents();

  const percent = taxPercent();
  // Tax applies to goods plus shipping, which is the common treatment for GST
  // and VAT on delivered goods.
  const taxCents = percentOfCents(subtotalCents + shippingCents, percent);

  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    taxLabel: taxLabel(),
    taxPercent: percent,
  };
}
