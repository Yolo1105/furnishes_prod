import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { PlaybookDetailView } from "@/components/eva-dashboard/account/views/playbook-detail-view";
type Params = { id: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return (
    <ToastProvider>
      <AccountShell>
        <PlaybookDetailView id={id} />
      </AccountShell>
    </ToastProvider>
  );
}
