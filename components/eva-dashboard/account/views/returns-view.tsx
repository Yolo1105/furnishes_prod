import Link from "next/link";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { AccountServerLink } from "@/components/eva-dashboard/account/account-server-link";
import { LOGIN_HREF } from "@/content/site/site";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  StatusBadge,
  EmptyState,
} from "@/components/eva-dashboard/account/shared";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { formatAccountDateTime } from "@/lib/site/account/account-datetime";
import type { AccountReturnsState } from "@/lib/site/account/server/returns";
import {
  supportStatusLabel,
  supportStatusVariant,
} from "@/lib/site/support/status";
import type { SupportThread } from "@/lib/site/support/types";

function categoryLabel(c: SupportThread["category"]): string {
  const map: Partial<Record<SupportThread["category"], string>> = {
    order: "Order or delivery",
    billing: "Billing",
  };
  return map[c] ?? c;
}

function ThreadCard({ t }: { t: SupportThread }) {
  return (
    <Link
      href={accountPaths.supportThread(t.id)}
      className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-[var(--accent-soft)]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-ui text-[10px] tracking-[0.14em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t.number}
          </span>
          <StatusBadge variant={supportStatusVariant(t.status)}>
            {supportStatusLabel(t.status)}
          </StatusBadge>
        </div>
        <p
          className="font-display mt-1 truncate text-base"
          style={{ color: "var(--foreground)" }}
        >
          {t.title}
        </p>
        <p
          className="font-body mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {categoryLabel(t.category)} · Updated{" "}
          {formatAccountDateTime(new Date(t.updatedAt))}
        </p>
      </div>
      <span
        className="font-ui shrink-0 text-[10px] tracking-[0.16em] uppercase"
        style={{ color: "var(--primary)" }}
      >
        View →
      </span>
    </Link>
  );
}

export function ReturnsView({
  state,
  signedOut,
}: {
  state: AccountReturnsState;
  signedOut?: boolean;
}) {
  if (signedOut) {
    return (
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <PageHeader
          eyebrow="RETURNS"
          title="Returns & exchanges"
          subtitle="Sign in to see support threads about your orders."
        />
        <EmptyState
          icon={LifeBuoy}
          title="Sign in required"
          body="Returns and exchanges are coordinated through support. Sign in to view your tickets."
          cta={
            <AccountServerLink href={LOGIN_HREF} variant="primary">
              Sign in
            </AccountServerLink>
          }
        />
      </div>
    );
  }

  const { openThreads, closedThreads, supportHref } = state;
  const hasThreads = openThreads.length > 0 || closedThreads.length > 0;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="RETURNS"
        title="Returns & exchanges"
        subtitle="Returns and exchanges are handled by our team through support — there is no self-serve return portal yet. Open a ticket under “Order or delivery” or “Billing” and we will guide you."
      />

      <SectionCard padding="lg" className="mb-8">
        <div className="flex flex-wrap items-start gap-4">
          <MessageCircle
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: "var(--primary)" }}
          />
          <div>
            <Eyebrow>How it works</Eyebrow>
            <p
              className="font-body mt-2 max-w-2xl text-sm leading-relaxed"
              style={{ color: "var(--foreground)" }}
            >
              Tell us your order number and what you need (return, exchange, or
              damaged item). We reply on business days — same thread as your
              other help requests.
            </p>
            <AccountServerLink
              href={supportHref}
              variant="primary"
              className="mt-4"
            >
              Contact support
            </AccountServerLink>
          </div>
        </div>
      </SectionCard>

      {!hasThreads ? (
        <EmptyState
          icon={LifeBuoy}
          title="No related requests yet"
          body="When you contact us about an order or refund, those conversations will appear here."
          cta={
            <AccountServerLink href={supportHref} variant="secondary">
              Open help
            </AccountServerLink>
          }
        />
      ) : (
        <div className="space-y-8">
          {openThreads.length > 0 && (
            <section>
              <h2
                className="font-display mb-4 text-xl"
                style={{ color: "var(--foreground)" }}
              >
                Open requests
              </h2>
              <SectionCard padding="none">
                <ul className="divide-border divide-y">
                  {openThreads.map((t) => (
                    <li key={t.id}>
                      <ThreadCard t={t} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </section>
          )}

          {closedThreads.length > 0 && (
            <section>
              <h2
                className="font-display mb-4 text-xl"
                style={{ color: "var(--foreground)" }}
              >
                Resolved requests
              </h2>
              <SectionCard padding="none">
                <ul className="divide-border divide-y">
                  {closedThreads.map((t) => (
                    <li key={t.id}>
                      <ThreadCard t={t} />
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
