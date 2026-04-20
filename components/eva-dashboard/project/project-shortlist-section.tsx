"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  ProjectCommentTargetType,
  ShortlistItemExternalLifecycle,
} from "@prisma/client";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import { EXECUTION_READINESS_LABEL } from "@/lib/eva/projects/execution-readiness";
import { OPERATIONAL_EXECUTION_PHASE_LABEL } from "@/lib/eva/projects/operational-rollup";
import {
  shortlistNeedsSubstitutionGuidance,
  type SubstitutionGuidanceDto,
} from "@/lib/eva/projects/substitution-guidance";
import {
  PHASE_7_UI_COPY,
  PROJECT_EXECUTION_UI_COPY,
  PROJECT_WORKSPACE_HUB_COPY,
  SUBSTITUTION_GUIDANCE_COPY,
  PROJECT_SHORTLIST_STATUS_LABEL,
  SHORTLIST_EXTERNAL_LIFECYCLE_LABEL,
  SHORTLIST_EXTERNAL_LIFECYCLE_SELECT_ORDER,
} from "@/lib/eva/projects/summary-constants";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import { apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { ProjectTargetCommentsPanel } from "@/components/eva-dashboard/project/project-target-comments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  summary: ProjectSummaryDto;
  projectId: string;
  onShortlistUpdated?: () => void;
};

type ShortlistDesignRole = "primary" | "backup" | "considering" | "rejected";

const STATUS_ORDER: ShortlistDesignRole[] = [
  "primary",
  "backup",
  "considering",
  "rejected",
];

function candidateRoleLabel(
  role: SubstitutionGuidanceDto["candidates"][number]["role"],
): string {
  if (role === "strongest")
    return PHASE_7_UI_COPY.substitutionCandidateStrongest;
  if (role === "budget") return PHASE_7_UI_COPY.substitutionCandidateBudget;
  return PHASE_7_UI_COPY.substitutionCandidateAlt;
}

function SubstitutionGuidanceBlock({
  guidance,
  currency,
  busy,
  onRecordCandidate,
}: {
  guidance: SubstitutionGuidanceDto;
  currency: string;
  busy: boolean;
  onRecordCandidate: (line: string) => void;
}) {
  return (
    <div className="mt-1 space-y-2">
      {guidance.impactSummary.map((line, i) => (
        <p key={i} className="text-foreground text-xs leading-relaxed">
          {line}
        </p>
      ))}
      {guidance.mustRevisit.length > 0 ? (
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            {PROJECT_EXECUTION_UI_COPY.changeImpactRevisit}
          </p>
          <ul className="text-muted-foreground mt-1 list-inside list-disc text-[11px]">
            {guidance.mustRevisit.slice(0, 5).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {guidance.stillValid.length > 0 ? (
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            {PROJECT_EXECUTION_UI_COPY.changeImpactStillValid}
          </p>
          <ul className="text-muted-foreground mt-1 list-inside list-disc text-[11px]">
            {guidance.stillValid.slice(0, 4).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-muted-foreground text-[10px] font-semibold uppercase">
        {PHASE_7_UI_COPY.substitutionHonestNextLabel}
      </p>
      <p className="text-foreground text-xs leading-relaxed">
        {guidance.honestNextStep}
      </p>
      {guidance.candidates.length > 0 ? (
        <ul className="space-y-2">
          {guidance.candidates.map((c) => (
            <li
              key={`${c.recommendationId}-${c.role}`}
              className="border-border bg-background/80 rounded-md border p-2"
            >
              <p className="text-muted-foreground text-[10px] font-medium uppercase">
                {candidateRoleLabel(c.role)}
              </p>
              <p className="text-foreground text-xs font-medium">{c.title}</p>
              <p className="text-muted-foreground mt-0.5 text-[10px]">
                {c.category}
                {c.estimatedPriceCents != null
                  ? ` · ${formatMoneyCentsLoose(c.estimatedPriceCents, currency)}`
                  : ""}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
                {c.reasonWhyItFits}
              </p>
              <button
                type="button"
                disabled={busy}
                className="text-primary mt-1 text-[10px] font-medium underline disabled:opacity-50"
                onClick={() =>
                  onRecordCandidate(
                    SUBSTITUTION_GUIDANCE_COPY.candidateNoteLine(
                      c.title,
                      c.recommendationId,
                    ),
                  )
                }
              >
                {PHASE_7_UI_COPY.substitutionRecordCandidateNoteCta}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const SHORTLIST_COMMENT_TARGET: ProjectCommentTargetType = "shortlist_item";

export function ProjectShortlistSection({
  summary,
  projectId,
  onShortlistUpdated,
}: Props) {
  const { onItemClick } = useAppContext();
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const rank = (s: (typeof STATUS_ORDER)[number]) => STATUS_ORDER.indexOf(s);
    return [...summary.shortlist].sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        a.productName.localeCompare(b.productName),
    );
  }, [summary.shortlist]);

  const patchItem = useCallback(
    async (
      itemId: string,
      body: {
        status?: ShortlistDesignRole;
        externalLifecycle?: string;
        notes?: string | null;
      },
    ) => {
      setBusyId(itemId);
      try {
        await apiPatch(
          API_ROUTES.projectShortlistItem(projectId, itemId),
          body,
        );
        toast.success(PHASE_7_UI_COPY.shortlistToastProcurementUpdated);
        onShortlistUpdated?.();
      } catch {
        toast.error("Could not update shortlist row");
      } finally {
        setBusyId(null);
      }
    },
    [projectId, onShortlistUpdated],
  );

  const phase = summary.externalExecution.phase;
  const phaseHints = summary.externalExecution.hints;

  return (
    <div className="border-border mb-4 rounded-lg border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Execution · shortlist
        </p>
        <span className="bg-muted text-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
          {EXECUTION_READINESS_LABEL[summary.executionReadiness]}
        </span>
      </div>

      <div className="border-border bg-muted/20 mb-3 rounded-md border border-dashed px-3 py-2 text-xs">
        <p className="text-foreground font-semibold">
          {PHASE_7_UI_COPY.operationalPhaseLabel}:{" "}
          {OPERATIONAL_EXECUTION_PHASE_LABEL[phase]}
        </p>
        {phaseHints.length > 0 ? (
          <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5">
            {phaseHints.slice(0, 4).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
        {summary.stats.shortlistCount === 0
          ? "Add picks from Recommendations to build a project shortlist. Mark one as Primary when you’re ready to execute."
          : `Shortlist: ${summary.stats.shortlistCount} item(s). Adjust design role and procurement state below — updates sync timeline and readiness.`}
      </p>

      {summary.stats.shortlistCount === 0 ? null : (
        <ul className="space-y-3 text-xs">
          {sorted.map((s) => (
            <li
              key={s.id}
              className="border-border flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-foreground font-medium">
                    {s.productName}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatMoneyCentsLoose(s.priceCents, s.currency)}
                  </span>
                </div>
                {busyId === s.id ? (
                  <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving…
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                  {PHASE_7_UI_COPY.shortlistDesignRoleLabel}
                  <select
                    className="border-border bg-background text-foreground max-w-[10rem] rounded border px-2 py-1 text-[11px] font-normal normal-case"
                    disabled={busyId === s.id}
                    value={s.status}
                    onChange={(e) =>
                      void patchItem(s.id, {
                        status: e.target.value as ShortlistDesignRole,
                      })
                    }
                  >
                    {STATUS_ORDER.map((st) => (
                      <option key={st} value={st}>
                        {PROJECT_SHORTLIST_STATUS_LABEL[st]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] font-semibold uppercase">
                  {PHASE_7_UI_COPY.shortlistProcurementLabel}
                  <select
                    className="border-border bg-background text-foreground max-w-[11rem] rounded border px-2 py-1 text-[11px] font-normal normal-case"
                    disabled={busyId === s.id}
                    value={s.externalLifecycle}
                    onChange={(e) =>
                      void patchItem(s.id, {
                        externalLifecycle: e.target.value,
                      })
                    }
                  >
                    {SHORTLIST_EXTERNAL_LIFECYCLE_SELECT_ORDER.map((lc) => (
                      <option key={lc} value={lc}>
                        {SHORTLIST_EXTERNAL_LIFECYCLE_LABEL[lc]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {shortlistNeedsSubstitutionGuidance(
                s.externalLifecycle as ShortlistItemExternalLifecycle,
              ) ? (
                <div className="w-full rounded-md border border-amber-500/25 bg-amber-500/5 p-3">
                  <p className="text-[10px] font-semibold text-amber-950 uppercase dark:text-amber-100">
                    {PHASE_7_UI_COPY.substitutionFlowEyebrow}
                  </p>
                  {summary.substitutionGuidanceByShortlistItemId[s.id] ? (
                    <SubstitutionGuidanceBlock
                      guidance={
                        summary.substitutionGuidanceByShortlistItemId[s.id]
                      }
                      currency={s.currency}
                      busy={busyId === s.id}
                      onRecordCandidate={(line) =>
                        void patchItem(s.id, {
                          notes: [s.notes?.trim(), line]
                            .filter(Boolean)
                            .join("\n"),
                        })
                      }
                    />
                  ) : (
                    <>
                      <p className="text-foreground mt-1 text-xs leading-relaxed">
                        {PHASE_7_UI_COPY.substitutionFlowBody}
                      </p>
                      <p className="text-muted-foreground mt-2 text-[11px] leading-snug">
                        {PROJECT_EXECUTION_UI_COPY.adaptationTip}
                      </p>
                    </>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-[11px] font-semibold"
                      onClick={() =>
                        onItemClick(
                          "recommendations",
                          PHASE_7_UI_COPY.substitutionOpenRecommendationsCta,
                        )
                      }
                    >
                      {PHASE_7_UI_COPY.substitutionOpenRecommendationsCta}
                    </button>
                    <span className="text-muted-foreground self-center text-[10px]">
                      {PHASE_7_UI_COPY.substitutionAfterSubstitutesPrefix}
                      <span className="text-foreground font-medium">
                        {
                          PROJECT_EXECUTION_UI_COPY.changeImpactRefreshSnapshotCta
                        }
                      </span>
                      {PHASE_7_UI_COPY.substitutionAfterSubstitutesSuffix}
                    </span>
                  </div>
                </div>
              ) : null}
              <ProjectTargetCommentsPanel
                projectId={projectId}
                targetType={SHORTLIST_COMMENT_TARGET}
                targetId={s.id}
                label={PROJECT_WORKSPACE_HUB_COPY.shortlistReviewThreadLabel}
                compact
                deferLoad
                className="w-full"
                onThreadsChanged={onShortlistUpdated}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`${accountPaths.project(projectId)}?tab=shortlist`}
          className={cn(
            "text-primary text-xs font-medium underline",
            summary.stats.shortlistCount === 0 && "opacity-60",
          )}
        >
          {PHASE_7_UI_COPY.shortlistOpenDetail}
        </Link>
        <span className="text-muted-foreground text-xs">·</span>
        <span className="text-muted-foreground text-xs">
          Export includes shortlist & chosen direction from{" "}
          <span className="text-foreground font-medium">Export</span>.
        </span>
      </div>
    </div>
  );
}
