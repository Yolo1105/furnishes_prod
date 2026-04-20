"use client";

import type { ProjectCommentTargetType } from "@prisma/client";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import { PROJECT_REVIEW_SYNTHETIC_TARGET } from "@/lib/eva/projects/review-targets";
import { EXECUTION_READINESS_LABEL } from "@/lib/eva/projects/execution-readiness";
import {
  PROJECT_EXECUTION_PACKAGE_COPY,
  PROJECT_SHORTLIST_STATUS_LABEL,
} from "@/lib/eva/projects/summary-constants";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import { ProjectTargetCommentsPanel } from "@/components/eva-dashboard/project/project-target-comments";
import { cn } from "@/lib/utils";

const PKG_COMMENT_TARGET: ProjectCommentTargetType = "project";

type Props = {
  summary: ProjectSummaryDto;
  /** Enables execution-package review thread (distinct from project overview). */
  projectId?: string;
  onCollaborationUpdated?: () => void;
  className?: string;
};

export function ProjectExecutionPackagePanel({
  summary,
  projectId,
  onCollaborationUpdated,
  className,
}: Props) {
  const ep = summary.executionPackage;
  const pd = summary.preferredDirection;
  const primary = ep.shortlistByStatus.primary;
  const backup = ep.shortlistByStatus.backup;
  const showPrimaryHint =
    primary.length === 0 && summary.stats.shortlistCount > 0;

  return (
    <section
      className={cn(
        "border-border bg-card mb-4 rounded-lg border p-4",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          {PROJECT_EXECUTION_PACKAGE_COPY.eyebrow}
        </p>
        <span className="bg-muted text-foreground rounded-full px-2 py-0.5 text-[10px] font-medium">
          {EXECUTION_READINESS_LABEL[summary.executionReadiness]}
        </span>
      </div>
      <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
        {PROJECT_EXECUTION_PACKAGE_COPY.intro}
      </p>

      {pd ? (
        <div className="mb-4">
          <h3 className="text-foreground mb-1 text-xs font-semibold">
            {PROJECT_EXECUTION_PACKAGE_COPY.preferredDirection}
          </h3>
          <p className="text-foreground text-sm font-medium">{pd.label}</p>
          {pd.notes ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {pd.notes}
            </p>
          ) : null}
          {pd.items.length > 0 ? (
            <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
              {pd.items.map((it) => (
                <li key={it.id}>
                  <span className="text-foreground font-medium">
                    {it.title}
                  </span>
                  {" · "}
                  {it.category}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground mb-4 text-xs">
          {PROJECT_EXECUTION_PACKAGE_COPY.emptyPreferred}
        </p>
      )}

      {primary.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-foreground mb-2 text-xs font-semibold">
            {PROJECT_EXECUTION_PACKAGE_COPY.primaryShortlist}{" "}
            <span className="text-muted-foreground font-normal">
              ({PROJECT_SHORTLIST_STATUS_LABEL.primary})
            </span>
          </h3>
          <ul className="space-y-2">
            {primary.map((s) => (
              <li
                key={s.id}
                className="border-border flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed pb-2 text-xs last:border-0 last:pb-0"
              >
                <span className="text-foreground font-medium">
                  {s.productName}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatMoneyCentsLoose(s.priceCents, s.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : showPrimaryHint ? (
        <p className="text-muted-foreground mb-4 text-xs">
          {PROJECT_EXECUTION_PACKAGE_COPY.hintNoPrimaryShortlist}
        </p>
      ) : null}

      {backup.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-foreground mb-2 text-xs font-semibold">
            {PROJECT_EXECUTION_PACKAGE_COPY.backups}
          </h3>
          <ul className="text-muted-foreground space-y-1 text-xs">
            {backup.map((s) => (
              <li key={s.id}>{s.productName}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ep.acceptedConstraints.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-foreground mb-2 text-xs font-semibold">
            {PROJECT_EXECUTION_PACKAGE_COPY.constraints}
          </h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
            {ep.acceptedConstraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ep.workflowOpenItems.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-foreground mb-2 text-xs font-semibold">
            {PROJECT_EXECUTION_PACKAGE_COPY.workflowOpenItems}
          </h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
            {ep.workflowOpenItems.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="text-foreground mb-1 text-xs font-semibold">
          {PROJECT_EXECUTION_PACKAGE_COPY.nextActions}
        </h3>
        <p className="text-foreground text-sm leading-relaxed">{ep.nextStep}</p>
      </div>

      {projectId ? (
        <ProjectTargetCommentsPanel
          projectId={projectId}
          targetType={PKG_COMMENT_TARGET}
          targetId={PROJECT_REVIEW_SYNTHETIC_TARGET.executionPackage}
          label={
            PROJECT_EXECUTION_PACKAGE_COPY.executionPackageReviewThreadLabel
          }
          compact
          deferLoad
          className="mt-4 border-t pt-3"
          onThreadsChanged={onCollaborationUpdated}
        />
      ) : null}
    </section>
  );
}
