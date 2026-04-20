"use client";

import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import { PROJECT_SUMMARY_COPY } from "@/lib/eva/projects/summary-constants";
import { ProjectArtifactTile } from "@/components/eva-dashboard/project/project-artifact-tile";
import { ProjectTargetCommentsPanel } from "@/components/eva-dashboard/project/project-target-comments";
import { cn } from "@/lib/utils";

type Props = {
  summary: ProjectSummaryDto;
  /** When set, each highlighted file can carry a lightweight review thread. */
  projectId?: string;
  onCollaborationUpdated?: () => void;
  className?: string;
};

/**
 * Real artifact rows from aggregated project summary (highlighted + recent).
 */
export function ProjectArtifactHighlights({
  summary,
  projectId,
  onCollaborationUpdated,
  className,
}: Props) {
  const fav = new Set(summary.decisionContext?.favoriteArtifactIds ?? []);
  const highlighted = summary.artifacts.highlighted;
  const recent = summary.artifacts.recentSample;

  if (highlighted.length === 0 && recent.length === 0) {
    return null;
  }

  return (
    <div className={cn("border-border rounded-lg border p-4", className)}>
      <p className="text-muted-foreground text-[10px] font-semibold uppercase">
        Key project files
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {PROJECT_SUMMARY_COPY.keyProjectFilesIntro}
      </p>

      {highlighted.length > 0 ? (
        <div className="mt-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">
            {PROJECT_SUMMARY_COPY.starredHighlightedHeading}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {highlighted.map((a) => (
              <li key={a.id} className="space-y-2">
                <ProjectArtifactTile artifact={a} starred={fav.has(a.id)} />
                {projectId ? (
                  <ProjectTargetCommentsPanel
                    projectId={projectId}
                    targetType="artifact"
                    targetId={a.id}
                    label="File review"
                    compact
                    deferLoad
                    onThreadsChanged={onCollaborationUpdated}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : summary.stats.fileCount > 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">
          {PROJECT_SUMMARY_COPY.noStarredFilesHint}
        </p>
      ) : null}

      {recent.length > 0 ? (
        <div className={highlighted.length > 0 ? "mt-4" : "mt-3"}>
          <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase">
            {PROJECT_SUMMARY_COPY.recentInProjectHeading}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recent.map((a) => (
              <li key={a.id}>
                <ProjectArtifactTile artifact={a} starred={fav.has(a.id)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
