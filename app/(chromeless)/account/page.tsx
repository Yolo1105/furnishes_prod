import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { DashboardHub } from "@/components/eva-dashboard/account/dashboard-hub";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountDashboard } from "@/lib/site/account/server/dashboard";

export default async function AccountDashboardPage() {
  const resolved = await resolveSession();
  const dash = await getAccountDashboard(resolved.user.id, resolved.counts, {
    name: resolved.user.name,
    email: resolved.user.email,
  });

  return (
    <ToastProvider>
      <AccountShell>
        <DashboardHub
          userName={dash.firstName}
          greeting={dash.greeting}
          counts={dash.counts}
          styleProfile={{
            name: dash.styleProfile.name,
            tagline: dash.styleProfile.tagline,
            palette: dash.styleProfile.palette,
            hasTaken: dash.styleProfile.hasTaken,
          }}
          usage={dash.usage}
          hasBudget={dash.hasBudget}
          budgetLabel={dash.budgetLabel}
          lastActivityLabel={dash.lastActivityLabel}
        />
      </AccountShell>
    </ToastProvider>
  );
}
