import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import { ToastProvider } from "@/components/eva-dashboard/account/shared";
import { ProjectReviewView } from "@/components/eva-dashboard/account/views/project-review-view";

type Params = { id: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return (
    <ToastProvider>
      <AccountShell>
        <ProjectReviewView id={id} />
      </AccountShell>
    </ToastProvider>
  );
}
