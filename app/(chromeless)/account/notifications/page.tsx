import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { NotificationsView } from "@/components/eva-dashboard/account/views/notifications-view";
import {
  notificationRowToPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/lib/site/account/account-prisma-mappers";

export default async function Page() {
  const session = await auth();
  let initial = DEFAULT_NOTIFICATION_PREFS;

  if (session?.user?.id) {
    const row = await prisma.notificationPrefs.findUnique({
      where: { userId: session.user.id },
    });
    if (row) {
      initial = notificationRowToPrefs(row);
    }
  }

  return (
    <ToastProvider>
      <AccountShell>
        <NotificationsView initial={initial} />
      </AccountShell>
    </ToastProvider>
  );
}
