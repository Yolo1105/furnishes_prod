"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import type {
  ProjectDetailGetResponse,
  ProjectSummaryDto,
} from "@/lib/eva/projects/api-types";
import { briefSnapshotLinesForUi } from "@/lib/eva/projects/brief-snapshot";
import {
  PROJECT_SUMMARY_UI,
  PROJECT_WORKSPACE_HUB_COPY,
} from "@/lib/eva/projects/summary-constants";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { ProjectStudioRoomSummaryCard } from "@/components/eva-dashboard/project/project-studio-room-summary";
import { ProjectSummaryOverview } from "@/components/eva-dashboard/project/project-summary-overview";
import { ProjectShortlistSection } from "@/components/eva-dashboard/project/project-shortlist-section";
import { ProjectChangeImpactPanel } from "@/components/eva-dashboard/project/project-change-impact-panel";
import { ProjectExecutionTasksPanel } from "@/components/eva-dashboard/project/project-execution-tasks-panel";
import { ProjectPacketSendPanel } from "@/components/eva-dashboard/project/project-packet-send-panel";
import { ProjectComparePaths } from "@/components/eva-dashboard/project/project-compare-paths";
import { ProjectMilestoneApprovalsPanel } from "@/components/eva-dashboard/project/project-milestone-approvals";
import { ProjectTargetCommentsPanel } from "@/components/eva-dashboard/project/project-target-comments";
import { stageDisplayLabel } from "@/lib/eva/design-workflow/stages";
import { Button } from "@/components/ui/button";

export function ProjectWorkspaceHub() {
  const ctx = useActiveProjectOptional();
  const { onItemClick } = useAppContext();
  const [data, setData] = useState<ProjectDetailGetResponse | null>(null);
  const [summary, setSummary] = useState<ProjectSummaryDto | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyProjectDetail = useCallback((r: ProjectDetailGetResponse) => {
    setData(r);
    setSummary(r.summary ?? null);
    setSummaryError(r.summary == null ? "Summary unavailable" : null);
  }, []);

  useEffect(() => {
    const id = ctx?.activeProjectId;
    if (!id) {
      setData(null);
      setSummary(null);
      setSummaryError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSummaryError(null);
    apiGet<ProjectDetailGetResponse>(
      API_ROUTES.project(id, { includeSummary: true }),
    )
      .then(applyProjectDetail)
      .catch(() => setError("Could not load project"))
      .finally(() => setLoading(false));
  }, [ctx?.activeProjectId, applyProjectDetail]);

  const activeProjectId = ctx?.activeProjectId ?? null;
  const refreshProjectAndSummary = useCallback(() => {
    if (!activeProjectId) return;
    void apiGet<ProjectDetailGetResponse>(
      API_ROUTES.project(activeProjectId, { includeSummary: true }),
    ).then(applyProjectDetail);
  }, [activeProjectId, applyProjectDetail]);

  if (!ctx) return null;

  if (!ctx.activeProjectId) {
    return (
      <div className="p-6">
        <h1 className="text-foreground mb-2 text-base font-semibold">
          Project
        </h1>
        <p className="text-muted-foreground mb-4 max-w-lg text-sm">
          Select a design project in the sidebar to scope chats, files, and
          workflow. You can work unscoped, but your threads won&apos;t be tied
          to a design effort until you assign them.
        </p>
        <p className="text-muted-foreground mb-4 text-xs">
          Standalone chats stay available — use{" "}
          <span className="text-foreground font-medium">Assign to project</span>{" "}
          in the header to link them later.
        </p>
        <Button asChild variant="default" size="sm">
          <Link href={accountPaths.projects}>Create or manage projects</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading project…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-destructive p-6 text-sm">
        {error ?? "Project unavailable"}
      </div>
    );
  }

  const brief =
    summary?.briefLines.map((e) => `${e.key}: ${e.value}`) ??
    briefSnapshotLinesForUi(data.project.briefSnapshot);

  return (
    <div className="p-6">
      <ProjectSummaryOverview
        summary={summary}
        error={summaryError}
        projectId={data.project.id}
        onOpenCompare={() => setShowCompare(true)}
        onDecisionSaved={refreshProjectAndSummary}
        className="mb-4"
      />
      {summary ? (
        <>
          <ProjectMilestoneApprovalsPanel
            projectId={data.project.id}
            summary={summary}
            className="mb-4"
            onApprovalsUpdated={refreshProjectAndSummary}
          />
          <ProjectTargetCommentsPanel
            projectId={data.project.id}
            targetType="project"
            targetId={data.project.id}
            label={PROJECT_WORKSPACE_HUB_COPY.projectReviewThreadLabel}
            className="mb-4"
            onThreadsChanged={refreshProjectAndSummary}
          />
          <p className="text-muted-foreground mb-4 text-xs">
            <Link
              href={accountPaths.projectReview(data.project.id)}
              className="text-primary font-medium underline"
            >
              Team review &amp; timeline
            </Link>
            {" · "}
            <Link
              href={accountPaths.project(data.project.id)}
              className="text-primary font-medium underline"
            >
              Account project
            </Link>
          </p>
          <ProjectChangeImpactPanel
            summary={summary}
            className="mb-4"
            onActionComplete={refreshProjectAndSummary}
          />
          <ProjectExecutionTasksPanel
            projectId={data.project.id}
            summary={summary}
            className="mb-4"
            onTasksUpdated={refreshProjectAndSummary}
          />
          {summary.execution.activeBlockers.length > 0 ? (
            <section className="border-border bg-card mb-4 rounded-lg border p-4">
              <p className="text-muted-foreground text-[10px] font-semibold uppercase">
                Execution blockers — review
              </p>
              <ul className="mt-2 space-y-4">
                {summary.execution.activeBlockers.map((b) => (
                  <li
                    key={b.id}
                    className="border-border rounded-md border p-3"
                  >
                    <p className="text-foreground text-sm font-medium">
                      {b.title}
                    </p>
                    {b.description ? (
                      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        {b.description}
                      </p>
                    ) : null}
                    <ProjectTargetCommentsPanel
                      projectId={data.project.id}
                      targetType="execution_blocker"
                      targetId={b.id}
                      label={
                        PROJECT_WORKSPACE_HUB_COPY.blockerReviewThreadLabel
                      }
                      compact
                      deferLoad
                      className="mt-3"
                      onThreadsChanged={refreshProjectAndSummary}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <ProjectPacketSendPanel
            projectId={data.project.id}
            summary={summary}
            className="mb-4"
            onSent={refreshProjectAndSummary}
          />
          <ProjectShortlistSection
            summary={summary}
            projectId={data.project.id}
            onShortlistUpdated={refreshProjectAndSummary}
          />
        </>
      ) : null}
      {showCompare && summary ? (
        <ProjectComparePaths
          projectId={data.project.id}
          summary={summary}
          onUpdated={() => {
            setShowCompare(false);
            refreshProjectAndSummary();
          }}
          className="mb-4"
        />
      ) : null}

      {data.latestStudioRoomSave ? (
        <ProjectStudioRoomSummaryCard
          save={data.latestStudioRoomSave}
          projectId={data.project.id}
          savedRoomId={data.latestStudioRoomSave.id}
          variant="compact"
          className="mb-4"
        />
      ) : null}

      <div className="border-border mb-4 rounded-lg border p-4">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Brief snapshot
        </p>
        {brief.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-xs">
            No brief fields captured yet. Chat with Eva while this project is
            active to fill preferences.
          </p>
        ) : (
          <ul className="text-foreground mt-2 space-y-1 text-xs">
            {brief.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-2">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Chats in this project
        </p>
        <ul className="mt-2 space-y-1">
          {data.conversations.length === 0 ? (
            <li className="text-muted-foreground text-xs">
              No threads yet — send a message with this project selected in the
              sidebar.
            </li>
          ) : (
            data.conversations
              .slice(0, PROJECT_SUMMARY_UI.hubConversationsListMax)
              .map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(`convo-${c.id}`, c.title)}
                    className="text-primary hover:text-primary/80 text-left text-sm underline"
                  >
                    {c.title}
                  </button>
                  <span className="text-muted-foreground ml-2 text-[10px] tabular-nums">
                    {c.messageCount} msgs
                  </span>
                </li>
              ))
          )}
        </ul>
      </div>

      {data.workflowHistory.length > 0 ? (
        <div className="mt-4 border-t pt-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            Recent workflow transitions
          </p>
          <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
            {data.workflowHistory
              .slice(0, PROJECT_SUMMARY_UI.hubWorkflowHistoryMax)
              .map((h) => (
                <li key={h.id}>
                  → {stageDisplayLabel(h.toStage)}
                  {h.reason ? ` — ${h.reason}` : ""}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
