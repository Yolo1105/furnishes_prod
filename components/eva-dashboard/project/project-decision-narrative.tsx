"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import {
  PROJECT_SUMMARY_COPY,
  PROJECT_SUMMARY_UI,
} from "@/lib/eva/projects/summary-constants";
import { cn } from "@/lib/utils";

type Props = {
  summary: ProjectSummaryDto;
  className?: string;
};

export function ProjectDecisionNarrative({ summary, className }: Props) {
  const {
    handoffReadiness,
    preferredDirection,
    decisionNotes,
    acceptedConstraints,
  } = summary;
  const hasComparison = (summary.comparisonCandidates ?? []).length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex gap-3 rounded-lg border p-3 text-sm",
          handoffReadiness.ready
            ? "border-success-border bg-success"
            : "border-review-border bg-review",
        )}
        role="status"
      >
        {handoffReadiness.ready ? (
          <CheckCircle2 className="text-success-solid mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangle className="text-review-muted mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div>
          <p
            className={
              handoffReadiness.ready
                ? "text-success-foreground font-medium"
                : "text-review-foreground font-medium"
            }
          >
            {handoffReadiness.headline}
          </p>
          {handoffReadiness.subline ? (
            <p className="text-muted-foreground mt-1 text-xs leading-snug">
              {handoffReadiness.subline}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-border rounded-lg border p-3">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Decision snapshot
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {PROJECT_SUMMARY_COPY.narrativeSnapshotIntro}
        </p>

        {preferredDirection ? (
          <div className="mt-3">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Preferred direction
            </p>
            <p className="text-foreground mt-1 font-medium">
              {preferredDirection.label}
            </p>
            {preferredDirection.notes ? (
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {preferredDirection.notes}
              </p>
            ) : null}
            {preferredDirection.items.length > 0 ? (
              <ul className="text-muted-foreground mt-2 space-y-2 text-xs">
                {preferredDirection.items
                  .slice(0, PROJECT_SUMMARY_UI.preferredDirectionMaxItems)
                  .map((i) => (
                    <li key={i.id} className="leading-snug">
                      <span className="text-foreground font-medium">
                        {i.title}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        ({i.category})
                      </span>
                      <span className="text-foreground/90 mt-0.5 block">
                        {i.reasonWhyItFits}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 text-xs">
            No preferred direction saved yet. Use{" "}
            <span className="text-foreground font-medium">Compare</span> when
            you have a saved recommendation run.
          </p>
        )}

        {decisionNotes ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Decision notes
            </p>
            <p className="text-foreground mt-1 text-xs leading-relaxed whitespace-pre-wrap">
              {decisionNotes}
            </p>
          </div>
        ) : null}

        {acceptedConstraints.length > 0 ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Accepted constraints
            </p>
            <ul className="text-foreground mt-1 list-inside list-disc text-xs">
              {acceptedConstraints.map((c, i) => (
                <li key={`${c}-${i}`}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasComparison ? (
          <div className="mt-4">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Last comparison
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(summary.comparisonCandidates ?? []).map((c) => (
                <div
                  key={c.id}
                  className="bg-muted/40 rounded-md border px-2 py-1.5 text-xs"
                >
                  <p className="text-foreground font-medium">{c.label}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {c.items.length} item{c.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {(summary.unresolvedSystem.length > 0 ||
          summary.unresolvedUser.length > 0) && (
          <div className="mt-4 border-t pt-3">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              Open items
            </p>
            {summary.unresolvedSystem.length > 0 ? (
              <div className="mt-2">
                <p className="text-muted-foreground text-[10px] font-medium">
                  {PROJECT_SUMMARY_COPY.openItemsWorkflow}
                </p>
                <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
                  {summary.unresolvedSystem.map((u, idx) => (
                    <li key={`sys-${idx}-${u.slice(0, 24)}`}>{u}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {summary.unresolvedUser.length > 0 ? (
              <div className="mt-3">
                <p className="text-muted-foreground text-[10px] font-medium">
                  {PROJECT_SUMMARY_COPY.openItemsUser}
                </p>
                <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
                  {summary.unresolvedUser.map((u, idx) => (
                    <li key={`usr-${idx}-${u.slice(0, 24)}`}>{u}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
