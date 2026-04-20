"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ProjectPacketDeliveryChannel,
  ProjectPacketKind,
} from "@prisma/client";
import { AlertTriangle, Package, Truck, Loader2, Download } from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import { OPERATIONAL_EXECUTION_PHASE_LABEL } from "@/lib/eva/projects/operational-rollup";
import {
  PHASE_7_UI_COPY,
  PROJECT_PACKET_DELIVERY_CHANNEL_LABEL,
  PROJECT_PACKET_DELIVERY_CHANNEL_SELECT_ORDER,
  PROJECT_PACKET_KIND_LABEL,
  PROJECT_PACKET_KIND_SELECT_ORDER,
  projectPacketChannelDisplay,
  projectPacketKindDisplay,
  SHORTLIST_EXTERNAL_LIFECYCLE_LABEL,
} from "@/lib/eva/projects/summary-constants";
import { apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import {
  Button,
  SectionCard,
  Eyebrow,
  LinkButton,
  TextInput,
  Select,
  useToast,
} from "@/components/eva-dashboard/account/shared";

export function ProjectExternalExecutionSection({
  projectId,
  summary,
  activeConversationId,
  onRefresh,
}: {
  projectId: string;
  summary: ProjectSummaryDto;
  activeConversationId: string | null;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<ProjectPacketKind>(
    ProjectPacketKind.execution_package,
  );
  const [channel, setChannel] = useState<ProjectPacketDeliveryChannel>(
    ProjectPacketDeliveryChannel.recorded_download,
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const ex = summary.externalExecution;
  const attention = summary.shortlist.filter(
    (s) =>
      s.externalLifecycle === "unavailable" ||
      s.externalLifecycle === "replaced",
  );
  const showSubstitution =
    ex.phase === "needs_substitution" || attention.length > 0;

  async function recordHandoff() {
    setBusy(true);
    try {
      await apiPost(API_ROUTES.projectPacketSends(projectId), {
        kind,
        channel,
        recipientEmail: recipientEmail.trim() || null,
      });
      toast.success(PHASE_7_UI_COPY.packetSuccess);
      onRefresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : PHASE_7_UI_COPY.packetRecordError,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard padding="lg">
        <Eyebrow>{PHASE_7_UI_COPY.externalExecutionEyebrow}</Eyebrow>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="border-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ color: "var(--foreground)" }}
          >
            <Truck className="text-primary h-3.5 w-3.5" />
            {PHASE_7_UI_COPY.operationalPhaseLabel}:{" "}
            <strong className="font-semibold">
              {OPERATIONAL_EXECUTION_PHASE_LABEL[ex.phase]}
            </strong>
          </span>
        </div>
        {ex.hints.length > 0 ? (
          <ul className="text-muted-foreground mt-3 list-inside list-disc text-sm">
            {ex.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      {showSubstitution ? (
        <SectionCard padding="lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-review-muted mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <Eyebrow>{PHASE_7_UI_COPY.substitutionEyebrow}</Eyebrow>
              <p
                className="text-muted-foreground mt-2 text-sm leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {PHASE_7_UI_COPY.substitutionIntro}
              </p>
              {attention.length > 0 ? (
                <>
                  <p
                    className="text-foreground mt-4 text-[10px] font-semibold tracking-wide uppercase"
                    style={{ color: "var(--foreground)" }}
                  >
                    {PHASE_7_UI_COPY.substitutionItemsHeading}
                  </p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {attention.map((s) => (
                      <li
                        key={s.id}
                        className="border-border flex flex-wrap items-baseline justify-between gap-2 rounded border px-3 py-2"
                      >
                        <span style={{ color: "var(--foreground)" }}>
                          {s.productName}
                        </span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {
                            SHORTLIST_EXTERNAL_LIFECYCLE_LABEL[
                              s.externalLifecycle
                            ]
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <LinkButton
                  href={accountPaths.projectWithTab(projectId, "shortlist")}
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                >
                  {PHASE_7_UI_COPY.ctaReviewShortlist}
                </LinkButton>
                {activeConversationId ? (
                  <LinkButton
                    href={accountPaths.conversation(activeConversationId)}
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    {PHASE_7_UI_COPY.ctaProjectChat}
                  </LinkButton>
                ) : null}
                <LinkButton
                  href={accountPaths.projectReview(projectId)}
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                >
                  {PHASE_7_UI_COPY.ctaTeamReview}
                </LinkButton>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard padding="lg">
        <div className="flex items-start gap-2">
          <Package className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <Eyebrow>{PHASE_7_UI_COPY.packetSendEyebrow}</Eyebrow>
            <p
              className="text-muted-foreground mt-2 text-sm leading-relaxed"
              style={{ color: "var(--muted-foreground)" }}
            >
              {PHASE_7_UI_COPY.packetSendIntro}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                  {PHASE_7_UI_COPY.packetKindLabel}
                </label>
                <Select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ProjectPacketKind)}
                  className="w-full text-sm"
                >
                  {PROJECT_PACKET_KIND_SELECT_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {PROJECT_PACKET_KIND_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                  {PHASE_7_UI_COPY.packetChannelLabel}
                </label>
                <Select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as ProjectPacketDeliveryChannel)
                  }
                  className="w-full text-sm"
                >
                  {PROJECT_PACKET_DELIVERY_CHANNEL_SELECT_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {PROJECT_PACKET_DELIVERY_CHANNEL_LABEL[c]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-wide uppercase">
                {PHASE_7_UI_COPY.packetRecipientLabel}
              </label>
              <TextInput
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={PHASE_7_UI_COPY.packetRecipientPlaceholder}
                className="max-w-md text-sm"
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => void recordHandoff()}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    {PHASE_7_UI_COPY.packetSubmitBusy}
                  </>
                ) : (
                  PHASE_7_UI_COPY.packetSubmit
                )}
              </Button>
              <Link
                href={API_ROUTES.projectExport(projectId, "html")}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs font-medium underline"
              >
                <Download className="h-3.5 w-3.5" />
                {PHASE_7_UI_COPY.packetDownloadHandoff}
              </Link>
            </div>
          </div>
        </div>

        {summary.recentPacketSends.length > 0 ? (
          <div className="border-border mt-6 border-t pt-4">
            <p
              className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              {PHASE_7_UI_COPY.packetRecentHeading}
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {summary.recentPacketSends.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="text-muted-foreground flex justify-between gap-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span>
                    {projectPacketKindDisplay(s.kind)} ·{" "}
                    {projectPacketChannelDisplay(s.channel)}
                  </span>
                  <span className="tabular-nums opacity-80">
                    {new Date(s.sentAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
