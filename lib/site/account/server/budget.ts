import "server-only";

import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AccountBudgetAllocation = {
  id: string;
  room: string;
  allocationCents: number;
  percentage: number;
};

export type AccountBudgetSnapshot = {
  currency: Currency;
  minCents: number;
  maxCents: number;
  rooms: AccountBudgetAllocation[];
} | null;

export async function getAccountBudget(
  userId: string,
): Promise<AccountBudgetSnapshot> {
  const row = await prisma.budget.findUnique({
    where: { userId },
    include: { rooms: { orderBy: { id: "asc" } } },
  });
  if (!row) return null;
  return {
    currency: row.currency,
    minCents: row.minCents,
    maxCents: row.maxCents,
    rooms: row.rooms.map((r) => ({
      id: r.id,
      room: r.room,
      allocationCents: r.allocationCents,
      percentage: r.percentage,
    })),
  };
}
