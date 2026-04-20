import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  PageSkeleton,
  ToastProvider,
  type PageSkeletonProps,
} from "@/components/eva-dashboard/account/shared";
type AccountSegmentLoadingProps = PageSkeletonProps;

const ZERO_COUNTS = {
  conversations: 0,
  shortlist: 0,
  projects: 0,
  uploads: 0,
};

/**
 * Use in account route `loading.tsx` files so the shell + sidebar stay
 * stable while a segment’s page streams in.
 */
export function AccountSegmentLoading(props: AccountSegmentLoadingProps) {
  return (
    <ToastProvider>
      <AccountShell userInitials="··" counts={ZERO_COUNTS}>
        <PageSkeleton {...props} />
      </AccountShell>
    </ToastProvider>
  );
}
