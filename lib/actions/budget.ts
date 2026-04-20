"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { BudgetSaveSchema } from "@/lib/validation/schemas";

export async function saveBudgetAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string; issues?: unknown }> {
  try {
    const { userId } = await requireUser();
    const data = BudgetSaveSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.upsert({
        where: { userId },
        create: {
          userId,
          minCents: data.minCents,
          maxCents: data.maxCents,
          currency: data.currency,
        },
        update: {
          minCents: data.minCents,
          maxCents: data.maxCents,
          currency: data.currency,
        },
      });

      await tx.roomBudget.deleteMany({ where: { budgetId: budget.id } });
      if (data.rooms.length > 0) {
        await tx.roomBudget.createMany({
          data: data.rooms.map((r) => ({
            budgetId: budget.id,
            room: r.room,
            allocationCents: r.allocationCents,
            percentage: r.percentage,
          })),
        });
      }

      await tx.activityEvent.create({
        data: {
          userId,
          category: "profile",
          label: "Budget updated",
        },
      });
    });

    revalidatePath("/account/budget");
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) {
      return {
        ok: false,
        error: "VALIDATION",
        issues: (e as { issues: unknown }).issues,
      };
    }
    console.error("[saveBudgetAction]", e);
    return { ok: false, error: "INTERNAL" };
  }
}
