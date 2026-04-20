import dynamic from "next/dynamic";
import { AccountShell } from "@/components/eva-dashboard/account/account-shell";
import {
  PageSkeleton,
  ToastProvider,
} from "@/components/eva-dashboard/account/shared";
import { listSupportThreads, getSupportThread } from "@/lib/site/support/store";
import { getUser } from "@/auth";
import { MOCK_USER_ID } from "@/lib/auth/mock-constants";

const SupportHelpView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/support-help-view").then(
      (m) => ({ default: m.SupportHelpView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="HELP" cards={3} />,
  },
);

const SupportFeedbackView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/support-feedback-view").then(
      (m) => ({ default: m.SupportFeedbackView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="FEEDBACK" cards={3} />,
  },
);

const SupportThreadDetailView = dynamic(
  () =>
    import("@/components/eva-dashboard/account/views/support-thread-detail-view").then(
      (m) => ({ default: m.SupportThreadDetailView }),
    ),
  {
    loading: () => <PageSkeleton eyebrow="SUPPORT" cards={2} />,
  },
);

/**
 * Consolidated /account/support/[slug] route.
 *
 * Matches 3 shapes:
 *   /account/support/help      → SupportHelpView
 *   /account/support/feedback  → SupportFeedbackView
 *   /account/support/<id>      → SupportThreadDetailView (treat as thread ID)
 *
 * Next.js doesn't allow two dynamic segments at the same level, so we
 * fold the known tab names and arbitrary thread IDs into one slug param
 * and dispatch here.
 *
 * This is an async server component — it fetches thread lists from the
 * store layer (DB or in-memory) and passes them down as `initial` props
 * so the client views render with real data.
 */
export default async function SupportSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const acting = await getUser().catch(() => null);
  const userId = acting?.userId ?? MOCK_USER_ID;

  const isTab = slug === "help" || slug === "feedback";
  const emptyPage = { threads: [], nextCursor: null };
  const [helpPage, feedbackPage, detailThread] = await Promise.all([
    slug === "help"
      ? listSupportThreads(userId, { kind: "HELP", limit: 20 })
      : Promise.resolve(emptyPage),
    slug === "feedback"
      ? listSupportThreads(userId, { kind: "FEEDBACK", limit: 20 })
      : Promise.resolve(emptyPage),
    !isTab ? getSupportThread(userId, slug) : Promise.resolve(null),
  ]);
  const helpThreads = helpPage.threads;
  const feedbackThreads = feedbackPage.threads;

  return (
    <ToastProvider>
      <AccountShell>
        {slug === "help" && <SupportHelpView initial={helpThreads} />}
        {slug === "feedback" && (
          <SupportFeedbackView initial={feedbackThreads} />
        )}
        {!isTab && (
          <SupportThreadDetailView
            id={slug}
            initial={detailThread ?? undefined}
          />
        )}
      </AccountShell>
    </ToastProvider>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const titles: Record<string, string> = {
    help: "Help",
    feedback: "Feedback",
  };
  return {
    title: `${titles[slug] ?? "Thread"} — Support — Furnishes Studio`,
  };
}
