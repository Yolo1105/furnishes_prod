"use client";

import {
  PageHeader,
  SectionCard,
  Eyebrow,
  StatusBadge,
  DataTable,
  EmptyState,
  PreviewBanner,
  type Column,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/formatters";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import type { Invoice } from "@/lib/site/account/types";

export function BillingView({
  invoices,
  usage,
}: {
  invoices: Invoice[];
  usage: { used: number; limit: number };
}) {
  const usagePct =
    usage.limit > 0
      ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
      : 0;

  const columns: Column<Invoice>[] = [
    {
      id: "number",
      header: "Invoice",
      cell: (r) => (
        <div>
          <div className="text-foreground font-mono text-xs">{r.number}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {r.description}
          </div>
        </div>
      ),
    },
    {
      id: "issued",
      header: "Date",
      sortable: true,
      sortAccessor: (r) => r.issuedAt,
      hiddenOnMobile: true,
      cell: (r) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {relativeTime(r.issuedAt)}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortAccessor: (r) => r.amountCents,
      cell: (r) => (
        <span className="text-foreground text-sm font-medium tabular-nums">
          {formatMoneyCentsLoose(r.amountCents, r.currency)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "w-24",
      cell: (r) => <StatusBadge variant={r.status} />,
    },
    {
      id: "pdf",
      header: "",
      width: "w-28",
      align: "right",
      cell: (r) =>
        r.pdfKey ? (
          <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
            On file
          </span>
        ) : (
          <span className="text-muted-foreground text-[10px]">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="PLAN"
        title="Billing"
        subtitle="Usage and invoices tied to your account."
      />

      <PreviewBanner />

      <SectionCard padding="lg" className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Eyebrow>EVA USAGE</Eyebrow>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              Approximate language-model tokens across your conversations
              (prompt + completion). Subscription products are not billed in-app
              yet; this is an honest usage readout from our logs.
            </p>
          </div>
          <div className="min-w-[260px] flex-1">
            <div className="text-muted-foreground mb-2 flex items-baseline justify-between text-xs">
              <span>Tokens (all time)</span>
              <span className="text-foreground tabular-nums">
                {usage.used.toLocaleString()}{" "}
                <span className="opacity-60">
                  / {usage.limit.toLocaleString()}
                </span>
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="mb-3">
        <Eyebrow>INVOICE HISTORY</Eyebrow>
        <h3 className="text-foreground mt-2 text-xl font-[var(--font-manrope)] tracking-tight">
          Invoices
        </h3>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="When you have paid orders or subscriptions linked to this account, invoices appear here."
        />
      ) : (
        <DataTable columns={columns} rows={invoices} />
      )}
    </div>
  );
}
