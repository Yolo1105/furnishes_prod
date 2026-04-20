import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { StyleView } from "@/components/eva-dashboard/account/views/style-view";

export default async function Page() {
  const session = await auth();
  let initial: {
    styleKey: string;
    name: string;
    tagline: string;
    description: string;
    palette: string[];
    keywords: string[];
    takenAt: string;
  } | null = null;

  if (session?.user?.id) {
    const row = await prisma.styleProfileRecord.findUnique({
      where: { userId: session.user.id },
    });
    if (row) {
      initial = {
        styleKey: row.styleKey,
        name: row.name,
        tagline: row.tagline,
        description: row.description,
        palette: row.palette,
        keywords: row.keywords,
        takenAt: row.takenAt.toISOString(),
      };
    }
  }

  return (
    <ToastProvider>
      <AccountShell>
        <StyleView initial={initial} />
      </AccountShell>
    </ToastProvider>
  );
}
