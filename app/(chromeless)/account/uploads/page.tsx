import dynamic from "next/dynamic";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  PageSkeleton,
  ToastProvider,
} from "@/components/eva-dashboard/account/shared";
import { resolveSession } from "@/lib/auth/resolve-session";
import { getAccountUploads } from "@/lib/site/account/server/uploads";

const UploadsView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/uploads-view").then(
      (m) => ({ default: m.UploadsView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="ROOM PHOTOS" cards={4} columns={3} />,
  },
);

export default async function Page() {
  const resolved = await resolveSession();
  const initial = await getAccountUploads(resolved.user.id);

  return (
    <ToastProvider>
      <AccountShell>
        <UploadsView initial={initial} />
      </AccountShell>
    </ToastProvider>
  );
}
