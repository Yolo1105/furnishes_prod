"use client";

import Link from "next/link";
import {
  ArrowRight,
  Download,
  GitCompare,
  Package,
  Sparkles,
} from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import { PROJECT_SUMMARY_COPY } from "@/lib/eva/projects/summary-constants";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { API_ROUTES } from "@/lib/eva-dashboard/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stageDisplayLabel } from "@/lib/eva/design-workflow/stages";
import { ProjectDecisionPanel } from "@/components/eva-dashboard/project/project-decision-panel";
import { ProjectDecisionNarrative } from "@/components/eva-dashboard/project/project-decision-narrative";
import { ProjectArtifactHighlights } from "@/components/eva-dashboard/project/project-artifact-highlights";
import { ProjectIntelligenceSynthesis } from "@/components/eva-dashboard/project/project-intelligence-synthesis";
import { ProjectExecutionPackagePanel } from "@/components/eva-dashboard/project/project-execution-package";
import { ProjectTargetCommentsPanel } from "@/components/eva-dashboard/project/project-target-comments";
import { EXECUTION_READINESS_LABEL } from "@/lib/eva/projects/execution-readiness";

type Props = {
  summary: ProjectSummaryDto | null;
  error: string | null;
  projectId: string;
  className?: string;
  onOpenCompare?: () => void;
  onDecisionSaved?: () => void;
};

export function ProjectSummaryOverview({
  summary,
  error,
  projectId,
  className,
  onOpenCompare,
  onDecisionSaved,
}: Props) {
  if (error || !summary) {
    return (
      <div
        className={cn(
          "border-border bg-card rounded-lg border p-4 text-sm text-red-600",
          className,
        )}
      >
        {error ?? "Summary unavailable"}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border bg-card space-y-4 rounded-lg border p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Project overview
          </p>
          <h2 className="text-foreground text-lg font-semibold">
            {summary.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {summary.room}
            {summary.roomType ? ` · ${summary.roomType}` : ""}
          </p>
          <p className="text-muted-foreground mt-2 text-[11px] font-medium">
            {EXECUTION_READINESS_LABEL[summary.executionReadiness]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={API_ROUTES.projectExport(projectId, "html")} download>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Handoff (HTML)
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={API_ROUTES.projectExport(projectId, "json")} download>
              JSON
            </a>
          </Button>
          {onOpenCompare ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onOpenCompare}
              disabled={!summary.recommendations.hasSnapshot}
              title={
                !summary.recommendations.hasSnapshot
                  ? PROJECT_SUMMARY_COPY.compareDisabledTitle
                  : undefined
              }
            >
              <GitCompare className="mr-1.5 h-3.5 w-3.5" />
              Compare
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-muted/30 rounded-md p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            Workflow
          </p>
          <p className="text-foreground mt-1 font-medium">
            {stageDisplayLabel(summary.workflowStage)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {summary.milestone.label}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            {summary.workflowEvaluation.transitionExplanation}
          </p>
        </div>
        <div className="bg-muted/30 rounded-md p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            Milestone
          </p>
          <p className="text-foreground mt-1 text-sm font-medium">
            {summary.milestone.hint}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {summary.nextStep}
          </p>
        </div>
      </div>

      <ProjectIntelligenceSynthesis summary={summary} />

      <ProjectExecutionPackagePanel
        summary={summary}
        projectId={projectId}
        onCollaborationUpdated={() => onDecisionSaved?.()}
        className="border-primary/15"
      />

      {summary.goalSummary ? (
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            Goal
          </p>
          <p className="text-foreground mt-1 text-sm leading-relaxed">
            {summary.goalSummary}
          </p>
        </div>
      ) : null}

      <ProjectDecisionNarrative summary={summary} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="text-primary h-4 w-4 shrink-0" />
          <span>
            Recommendations:{" "}
            <span className="text-foreground font-medium">
              {summary.recommendations.hasSnapshot
                ? `${summary.recommendations.topItems.length} saved`
                : "none saved"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Package className="text-primary h-4 w-4 shrink-0" />
          <span>
            Shortlist:{" "}
            <span className="text-foreground font-medium">
              {summary.stats.shortlistCount}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Files: {summary.stats.fileCount} · Chats:{" "}
            {summary.stats.conversationCount}
          </span>
        </div>
      </div>

      {summary.recommendations.hasSnapshot &&
      summary.recommendations.topItems.length > 0 ? (
        <div className="border-border rounded-lg border p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            Saved recommendations — review
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Short threads per saved pick so direction stays discussable without
            leaving the overview.
          </p>
          <ul className="mt-3 space-y-3">
            {summary.recommendations.topItems.slice(0, 4).map((item) => (
              <li key={item.id} className="border-border rounded-md border p-2">
                <p className="text-foreground text-xs font-medium">
                  {item.title}
                </p>
                <ProjectTargetCommentsPanel
                  projectId={projectId}
                  targetType="recommendation"
                  targetId={item.id}
                  label="Notes"
                  compact
                  deferLoad
                  onThreadsChanged={() => onDecisionSaved?.()}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ProjectArtifactHighlights
        summary={summary}
        projectId={projectId}
        onCollaborationUpdated={() => onDecisionSaved?.()}
      />

      <ProjectDecisionPanel
        projectId={projectId}
        summary={summary}
        onSaved={() => onDecisionSaved?.()}
      />

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="ghost" size="sm" asChild>
          <Link href={accountPaths.project(projectId)}>
            Account project
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
