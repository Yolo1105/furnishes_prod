"use client";

import {
  AlertTriangle,
  Compass,
  Footprints,
  History,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import {
  PROJECT_COLLABORATION_COPY,
  PROJECT_INTELLIGENCE_SYNTHESIS_COPY,
  projectCollaborationSynthesisOpenCommentsLine,
} from "@/lib/eva/projects/summary-constants";
import { cn } from "@/lib/utils";

type Props = {
  summary: ProjectSummaryDto;
  className?: string;
};

export function ProjectIntelligenceSynthesis({ summary, className }: Props) {
  const primaryNames = summary.shortlist
    .filter((s) => s.status === "primary")
    .map((s) => s.productName.trim())
    .filter(Boolean);
  const nConstraints = summary.acceptedConstraints.length;
  const nHighlighted = summary.artifacts.highlighted.length;

  const directionParagraph = summary.preferredDirection
    ? summary.preferredDirection.items.length > 0
      ? `${summary.preferredDirection.label} — leading picks include ${summary.preferredDirection.items
          .slice(0, 2)
          .map((i) => i.title)
          .join(
            ", ",
          )}${summary.preferredDirection.items.length > 2 ? "…" : "."}`
      : `${summary.preferredDirection.label}.`
    : PROJECT_INTELLIGENCE_SYNTHESIS_COPY.noPreferredDirection;

  const whyLines: string[] = [];
  if (nConstraints > 0) {
    whyLines.push(
      `${nConstraints} accepted constraint${nConstraints === 1 ? "" : "s"} anchor recommendations, ranking, and handoff.`,
    );
  }
  if (primaryNames.length > 0) {
    whyLines.push(
      `Primary shortlist: ${primaryNames.slice(0, 4).join(" · ")}${primaryNames.length > 4 ? "…" : ""}.`,
    );
  }
  if (nHighlighted > 0) {
    whyLines.push(
      `${nHighlighted} starred file${nHighlighted === 1 ? "" : "s"} actively influence recommendations and workflow hints.`,
    );
  }
  if (whyLines.length === 0) {
    whyLines.push(PROJECT_INTELLIGENCE_SYNTHESIS_COPY.addSignalsHint);
  }

  const pulseRecent = summary.projectInsights.whatChangedRecently;
  const pulseOpen = summary.projectInsights.primaryBlockers;
  const execBlockers = summary.execution.activeBlockers;

  return (
    <div
      className={cn(
        "border-border bg-muted/15 space-y-3 rounded-lg border p-4",
        className,
      )}
    >
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.eyebrow}
      </p>

      <div className="flex gap-2">
        <Compass className="text-primary mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.directionHeading}
          </p>
          <p className="text-foreground mt-1 text-sm leading-snug">
            {directionParagraph}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Footprints className="text-primary mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.whyHeading}
          </p>
          <ul className="text-foreground mt-1 list-inside list-disc space-y-1 text-xs leading-snug">
            {whyLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {(pulseRecent || pulseOpen.length > 0) && (
        <div className="flex gap-2">
          <History className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 space-y-2 text-xs leading-snug">
            {pulseRecent ? (
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                  {
                    PROJECT_INTELLIGENCE_SYNTHESIS_COPY.whatChangedRecentlyHeading
                  }
                </p>
                <p className="text-foreground mt-0.5">{pulseRecent}</p>
              </div>
            ) : null}
            {pulseOpen.length > 0 ? (
              <div>
                <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                  {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.openSignalsHeading}
                </p>
                <p className="text-foreground mt-0.5">
                  {pulseOpen.join(" · ")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {execBlockers.length > 0 ? (
        <div className="flex gap-2 border-t border-dashed pt-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.executionBlockersHeading}
            </p>
            <ul className="text-foreground mt-1 list-inside list-disc space-y-1 text-xs leading-snug">
              {execBlockers.map((b) => (
                <li key={b.id}>
                  <span className="font-medium">{b.title}</span>
                  {b.description ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {b.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {summary.collaboration &&
        (summary.collaboration.unresolvedCommentCount > 0 ||
          summary.collaboration.hasPendingApprovals) && (
          <div className="flex gap-2 border-t border-dashed pt-3">
            <MessageSquare className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                {PROJECT_COLLABORATION_COPY.collaborationSectionEyebrow}
              </p>
              {summary.collaboration.unresolvedCommentCount > 0 ? (
                <p className="text-foreground mt-1 text-xs leading-snug">
                  {projectCollaborationSynthesisOpenCommentsLine(
                    summary.collaboration.unresolvedCommentCount,
                  )}
                </p>
              ) : null}
              {summary.collaboration.hasPendingApprovals ? (
                <p className="text-foreground mt-1 text-xs leading-snug">
                  {PROJECT_COLLABORATION_COPY.synthesisHandoffAwaitingApproval}
                </p>
              ) : null}
            </div>
          </div>
        )}

      <div className="flex gap-2 border-t border-dashed pt-3">
        <Zap className="text-primary mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.nextHeading}
          </p>
          <p className="text-foreground mt-1 text-sm leading-snug font-medium">
            {summary.nextBestAction}
          </p>
          <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-[11px] leading-snug">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              <span className="text-foreground/90 font-medium">
                {PROJECT_INTELLIGENCE_SYNTHESIS_COPY.workflowHint}:{" "}
              </span>
              {summary.nextStep}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
