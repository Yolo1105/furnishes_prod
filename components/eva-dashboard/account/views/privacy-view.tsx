"use client";

import { Download, AlertTriangle, Mail } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  Eyebrow,
  StatusBadge,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import {
  ACCOUNT_DPO_EMAIL,
  ACCOUNT_DPO_MAILTO,
} from "@/lib/site/account/account-contacts";
import { relativeTime } from "@/lib/site/account/formatters";
import type { ConsentRow } from "@/lib/site/account/types";

export function PrivacyView({ consents }: { consents: ConsentRow[] }) {
  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="DATA"
        title="Your data"
        subtitle="Consent history and how to reach us for access or deletion requests."
      />

      <PreviewBanner />

      <SectionCard padding="lg" className="mb-5">
        <div className="flex items-start gap-3">
          <div className="bg-muted border-border inline-flex h-10 w-10 shrink-0 items-center justify-center border">
            <Download className="text-foreground h-4 w-4" />
          </div>
          <div>
            <Eyebrow>EXPORT YOUR DATA</Eyebrow>
            <h3 className="text-foreground mt-1 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
              Packaged download
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              There is no export action on this page yet. When self-serve
              downloads are available, completed exports will be listed here
              with retrieval instructions.
            </p>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              If you need a copy of your data now, email the Data Protection
              Officer using the address in the footer.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard padding="lg" className="border-destructive/20 mb-5">
        <div className="flex items-start gap-3">
          <div className="bg-destructive/10 inline-flex h-10 w-10 shrink-0 items-center justify-center">
            <AlertTriangle className="text-destructive h-4 w-4" />
          </div>
          <div>
            <Eyebrow>DELETE ACCOUNT</Eyebrow>
            <h3 className="text-foreground mt-1 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
              Self-serve deletion
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              Account deletion cannot be started from Furnishes Studio. For
              removal requests, email the Data Protection Officer (see below) or
              your usual Furnishes support channel.
            </p>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">
              We will confirm identity and process requests in line with
              applicable law and our retention policies.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard padding="lg" className="mb-5">
        <div className="mb-4">
          <Eyebrow>CONSENT LOG</Eyebrow>
          <h3 className="text-foreground mt-1 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
            What you&apos;ve agreed to
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Records from the database. Updates to consent are not yet exposed
            here.
          </p>
        </div>

        {consents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No consent events recorded yet.
          </p>
        ) : (
          <div className="border-border overflow-hidden border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-[10px] tracking-wider uppercase">
                <tr className="border-border border-b">
                  <th className="px-4 py-3 text-left font-semibold">Consent</th>
                  <th className="px-4 py-3 text-left font-semibold">Granted</th>
                  <th className="px-4 py-3 text-left font-semibold">Source</th>
                  <th className="w-28 px-4 py-3 text-right font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {consents.map((c) => (
                  <tr
                    key={c.id}
                    className="border-border border-b last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">
                        {c.kind}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {relativeTime(c.grantedAt)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {c.source}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <StatusBadge variant={c.active ? "ok" : "neutral"}>
                          {c.active ? "ACTIVE" : "REVOKED"}
                        </StatusBadge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard padding="lg" tone="muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail className="text-muted-foreground mt-1 h-5 w-5" />
            <div>
              <div className="text-foreground text-sm font-medium">
                Questions about your data?
              </div>
              <p className="text-muted-foreground mt-1 max-w-xl text-sm">
                Furnishes complies with Singapore&apos;s PDPA. For formal
                requests, contact our Data Protection Officer.
              </p>
            </div>
          </div>
          <a
            href={ACCOUNT_DPO_MAILTO}
            className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase hover:underline"
          >
            {ACCOUNT_DPO_EMAIL} →
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
