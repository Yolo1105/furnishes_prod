import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/commerce/money";

export { SUPPORTED_CURRENCIES };

const roomAllocationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  amount: z.number().nonnegative(),
});

const budgetInputSchema = z
  .object({
    minimum: z.number().nonnegative().nullable().optional(),
    maximum: z.number().nonnegative().nullable().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES),
    allocations: z.array(roomAllocationSchema).max(20).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.minimum != null &&
      value.maximum != null &&
      value.maximum < value.minimum
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maximum"],
        message: "Maximum cannot be below minimum.",
      });
    }
  });

type RoomAllocation = {
  name: string;
  description: string;
  amount: number;
};

export type BudgetData = {
  minimum: number | null;
  maximum: number | null;
  currency: (typeof SUPPORTED_CURRENCIES)[number];
  allocations: RoomAllocation[];
};

/** Reference-aligned starter rooms when a budget has no allocations yet. */
export const DEFAULT_ROOM_ALLOCATIONS: RoomAllocation[] = [
  {
    name: "Living room",
    description: "Sofa, lighting, rug, coffee table",
    amount: 7200,
  },
  {
    name: "Bedroom",
    description: "Bed frame, side tables, lamps",
    amount: 4000,
  },
  {
    name: "Dining",
    description: "Table, 4 chairs",
    amount: 3000,
  },
  {
    name: "Home office",
    description: "Desk, chair, shelving",
    amount: 2500,
  },
  {
    name: "Balcony",
    description: "Bench, planters",
    amount: 1300,
  },
];

export function parseBudgetInput(input: unknown) {
  return budgetInputSchema.safeParse(input);
}

export function parseAllocationsJson(
  raw: string | null | undefined,
): RoomAllocation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(roomAllocationSchema).safeParse(parsed);
    if (!result.success) return [];
    return result.data.map((row) => ({
      name: row.name,
      description: row.description?.trim() || "",
      amount: row.amount,
    }));
  } catch {
    return [];
  }
}
