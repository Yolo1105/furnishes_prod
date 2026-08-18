import type { Metadata } from "next";
import { BudgetPage } from "@/features/account/profile/BudgetPage";
import { getBudget } from "@/server/account/budget";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountBudgetRoute() {
  const session = await requireCurrentSession();
  const budget = await getBudget(session.user.id);

  return <BudgetPage initialBudget={budget} />;
}

export const metadata: Metadata = {
  title: "Budget",
};
