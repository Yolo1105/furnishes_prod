import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ShortlistDetailView } from "@/components/eva-dashboard/account/views/shortlist-detail-view";
import { shortlistRowToDetail } from "@/lib/site/account/account-prisma-mappers";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const row = await prisma.shortlistItem.findFirst({
    where: { id, userId: session.user.id },
    include: { project: { select: { title: true } } },
  });

  if (!row) {
    notFound();
  }

  const relatedRows = await prisma.shortlistItem.findMany({
    where: {
      userId: session.user.id,
      NOT: { id: row.id },
      ...(row.projectId != null
        ? { projectId: row.projectId }
        : { projectId: null }),
    },
    take: 8,
    select: { id: true },
  });

  const item = shortlistRowToDetail(
    row,
    relatedRows.map((r) => r.id),
  );

  return (
    <ToastProvider>
      <AccountShell>
        <ShortlistDetailView item={item} />
      </AccountShell>
    </ToastProvider>
  );
}
