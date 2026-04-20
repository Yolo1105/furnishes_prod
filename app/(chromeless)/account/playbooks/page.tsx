import dynamic from "next/dynamic";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  PageSkeleton,
  ToastProvider,
} from "@/components/eva-dashboard/account/shared";

const PlaybooksView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/playbooks-view").then(
      (m) => ({ default: m.PlaybooksView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="FIELD NOTES" cards={4} columns={3} />,
  },
);

export default function Page() {
  return (
    <ToastProvider>
      <AccountShell>
        <PlaybooksView />
      </AccountShell>
    </ToastProvider>
  );
}
