import dynamic from "next/dynamic";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  PageSkeleton,
  ToastProvider,
} from "@/components/eva-dashboard/account/shared";

const ProjectsView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/projects-view").then(
      (m) => ({ default: m.ProjectsView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="WORKSPACES" cards={4} />,
  },
);

export default function Page() {
  return (
    <ToastProvider>
      <AccountShell>
        <ProjectsView />
      </AccountShell>
    </ToastProvider>
  );
}
