import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import {
  parseAllocationsJson,
  parseBudgetInput,
  type BudgetData,
} from "./budget-schema";

export {
  DEFAULT_ROOM_ALLOCATIONS,
  SUPPORTED_CURRENCIES,
  type BudgetData,
} from "./budget-schema";

export async function getBudget(userId: string): Promise<BudgetData> {
  const budget = await prisma.budget.findUnique({ where: { userId } });
  if (!budget) {
    return {
      minimum: null,
      maximum: null,
      currency: "SGD",
      allocations: [],
    };
  }
  return {
    minimum: budget.minimum,
    maximum: budget.maximum,
    currency: budget.currency as BudgetData["currency"],
    allocations: parseAllocationsJson(budget.allocationsJson),
  };
}

export async function updateBudget(
  userId: string,
  input: unknown,
): Promise<ServiceResult<BudgetData, "validation">> {
  const parsed = parseBudgetInput(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return err("validation", "Check the highlighted fields.", fieldErrors);
  }

  const allocations = (parsed.data.allocations ?? []).map((row) => ({
    name: row.name.trim(),
    description: row.description?.trim() || "",
    amount: row.amount,
  }));

  const budget = await prisma.budget.upsert({
    where: { userId },
    create: {
      userId,
      minimum: parsed.data.minimum ?? null,
      maximum: parsed.data.maximum ?? null,
      currency: parsed.data.currency,
      allocationsJson: JSON.stringify(allocations),
    },
    update: {
      minimum: parsed.data.minimum ?? null,
      maximum: parsed.data.maximum ?? null,
      currency: parsed.data.currency,
      allocationsJson: JSON.stringify(allocations),
    },
  });

  return ok({
    minimum: budget.minimum,
    maximum: budget.maximum,
    currency: budget.currency as BudgetData["currency"],
    allocations: parseAllocationsJson(budget.allocationsJson),
  });
}
