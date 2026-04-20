import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ShortlistView } from "@/components/eva-dashboard/account/views/shortlist-view";
import { shortlistRowToListItem } from "@/lib/site/account/account-prisma-mappers";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <ToastProvider>
        <AccountShell>
          <ShortlistView initial={[]} projects={[]} />
        </AccountShell>
      </ToastProvider>
    );
  }

  const userId = session.user.id;
  const [rows, projects] = await Promise.all([
    prisma.shortlistItem.findMany({
      where: { userId },
      include: { project: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId, archivedAt: null },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const initial = rows.map((r) => shortlistRowToListItem(r));

  return (
    <ToastProvider>
      <AccountShell>
        <ShortlistView initial={initial} projects={projects} />
      </AccountShell>
    </ToastProvider>
  );
}
