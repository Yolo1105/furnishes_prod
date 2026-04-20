"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, History } from "lucide-react";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { ProjectSummaryOverview } from "@/components/eva-dashboard/project/project-summary-overview";
import { ProjectArtifactHighlights } from "@/components/eva-dashboard/project/project-artifact-highlights";
import { ProjectMilestoneApprovalsPanel } from "@/components/eva-dashboard/project/project-milestone-approvals";
import {
  LinkButton,
  SectionCard,
  Eyebrow,
} from "@/components/eva-dashboard/account/shared";

type TimelineEvent = {
  id: string;
  kind: string;
  label: string;
  createdAt: string;
};

export function ProjectReviewView({ id }: { id: string }) {
  const [detail, setDetail] = useState<ProjectDetailGetResponse | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void apiGet<ProjectDetailGetResponse>(
      API_ROUTES.project(id, { includeSummary: true }),
    )
      .then((d) => {
        setDetail(d);
        setLoadError(null);
      })
      .catch(() => setLoadError("Failed to load project"));
    void apiGet<{ events: TimelineEvent[] }>(API_ROUTES.projectTimeline(id, 40))
      .then((r) => setEvents(r.events))
      .catch(() => setEvents([]));
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loadError) {
    return <p className="text-destructive p-6 text-sm">{loadError}</p>;
  }

  if (!detail?.summary) {
    return <p className="text-muted-foreground p-6 text-sm">Loading review…</p>;
  }

  const s = detail.summary;
  const collab = s.collaboration;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <LinkButton
          href={accountPaths.project(id)}
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Project
        </LinkButton>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Review mode
        </p>
      </div>

      <ProjectSummaryOverview
        summary={s}
        error={null}
        projectId={id}
        onDecisionSaved={refresh}
        className="border-primary/20"
      />

      <ProjectMilestoneApprovalsPanel
        projectId={id}
        summary={s}
        onApprovalsUpdated={refresh}
        className="border-primary/15"
      />

      <ProjectArtifactHighlights
        summary={s}
        projectId={id}
        onCollaborationUpdated={refresh}
      />

      {collab ? (
        <SectionCard padding="lg">
          <Eyebrow>REVIEW GATES</Eyebrow>
          <ul className="text-foreground mt-3 space-y-2 text-sm">
            <li>
              Open review comments:{" "}
              <strong>{collab.unresolvedCommentCount}</strong>
            </li>
            <li>
              Export &amp; milestone gates:{" "}
              <strong>
                {collab.handoffClearForExport
                  ? "Clear for export"
                  : "Blocked until open comments are resolved and no approvals are pending"}
              </strong>
            </li>
          </ul>
          <LinkButton
            href={accountPaths.evaDesignWorkspace}
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            Open design workspace
          </LinkButton>
        </SectionCard>
      ) : null}

      <SectionCard padding="lg">
        <div className="mb-2 flex items-center gap-2">
          <History className="text-primary h-4 w-4" />
          <Eyebrow>DECISION TIMELINE</Eyebrow>
        </div>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((e) => (
              <li
                key={e.id}
                className="border-border border-b border-dashed pb-2 last:border-0"
              >
                <span className="text-muted-foreground text-xs tabular-nums">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
                <p className="text-foreground mt-0.5">{e.label}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
