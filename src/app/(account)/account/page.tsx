import type { Metadata } from "next";
import { DashboardPage } from "@/features/account/dashboard/DashboardPage";
import { getAccountDashboard } from "@/server/account/dashboard";
import { requireCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AccountDashboardRoute() {
  const session = await requireCurrentSession();
  const model = await getAccountDashboard(session.user.id);
  return <DashboardPage model={model} />;
}
