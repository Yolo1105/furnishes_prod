import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { PreferencesView } from "@/components/eva-dashboard/account/views/preferences-view";
import type { UserPreference, PreferenceGroup } from "@/lib/site/account/types";

export default async function Page() {
  const session = await auth();
  let initial: UserPreference[] = [];

  if (session?.user?.id) {
    const rows = await prisma.userPreference.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        sourceConversation: { select: { title: true } },
      },
    });
    initial = rows.map((r) => ({
      id: r.id,
      group: r.group as PreferenceGroup,
      field: r.field,
      value: r.value,
      confidence: r.confidence,
      status: r.status,
      sourceConversationId: r.sourceConversationId ?? undefined,
      sourceConversationTitle: r.sourceConversation?.title ?? undefined,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  return (
    <ToastProvider>
      <AccountShell>
        <PreferencesView initial={initial} />
      </AccountShell>
    </ToastProvider>
  );
}
