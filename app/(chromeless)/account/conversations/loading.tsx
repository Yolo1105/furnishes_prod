import { AccountSegmentLoading } from "@/components/eva-dashboard/account/account-segment-loading";

export default function ConversationsLoading() {
  return (
    <AccountSegmentLoading eyebrow="CONVERSATIONS" cards={4} columns={2} />
  );
}
