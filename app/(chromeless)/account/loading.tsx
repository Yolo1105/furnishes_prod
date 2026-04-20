import { AccountSegmentLoading } from "@/components/eva-dashboard/account/account-segment-loading";

/**
 * Default loading skeleton for /account routes (no more specific `loading.tsx`).
 */
export default function AccountLoading() {
  return <AccountSegmentLoading eyebrow="STUDIO" cards={6} columns={3} />;
}
