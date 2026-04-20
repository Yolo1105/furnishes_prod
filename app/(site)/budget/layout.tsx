import type { Metadata } from "next";
import { StyleExplorerRouteShell } from "@/components/site/StyleExplorerRouteShell";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Budget Planner | ${SITE_TITLE}`,
  description:
    "Plan your room budget: guided estimate or your own number, plus category priorities.",
};

export default function BudgetPlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StyleExplorerRouteShell>{children}</StyleExplorerRouteShell>;
}
