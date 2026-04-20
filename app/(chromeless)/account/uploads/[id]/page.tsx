import { notFound } from "next/navigation";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { UploadDetailView } from "@/components/eva-dashboard/account/views/upload-detail-view";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountUploadById } from "@/lib/site/account/server/uploads";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolved = await resolveSession();
  const upload = await getAccountUploadById(resolved.user.id, id);
  if (!upload) notFound();

  return (
    <ToastProvider>
      <AccountShell>
        <UploadDetailView upload={upload} />
      </AccountShell>
    </ToastProvider>
  );
}
