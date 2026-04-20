"use client";

import { AlertTriangle, GitBranch, ListTree } from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import { PROJECT_EXECUTION_UI_COPY } from "@/lib/eva/projects/summary-constants";
import { cn } from "@/lib/utils";

type Props = {
  summary: ProjectSummaryDto;
  className?: string;
  /** Refresh project summary after user reconciles execution state elsewhere. */
  onActionComplete?: () => void;
};

export function ProjectChangeImpactPanel({
  summary,
  className,
  onActionComplete,
}: Props) {
  const ex = summary.execution;
  const ci = ex.changeImpact;
  const volatile = ci?.volatile;
  const subs = ex.substitutionLog.slice(0, 8);
  const integrityReasons = ex.pathIntegrity.reasons.filter(Boolean);
  const C = PROJECT_EXECUTION_UI_COPY;

  const hasVolatile =
    volatile &&
    (volatile.affectedAreas.length > 0 ||
      volatile.mustRevisit.length > 0 ||
      volatile.stillValid.length > 0);

  const substitutionPhase =
    summary.externalExecution.phase === "needs_substitution" &&
    summary.externalExecution.hints.length > 0;

  if (
    !hasVolatile &&
    subs.length === 0 &&
    integrityReasons.length === 0 &&
    !substitutionPhase
  ) {
    return null;
  }

  return (
    <section
      className={cn("border-border bg-card rounded-lg border p-4", className)}
    >
      <div className="mb-3 flex items-center gap-2">
        <GitBranch className="text-primary h-4 w-4 shrink-0" />
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          {C.changeImpactPanelEyebrow}
        </p>
      </div>
      <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
        {C.changeImpactPanelIntro}
      </p>

      {substitutionPhase ? (
        <div className="border-border mb-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-foreground text-xs font-medium">
            {C.changeImpactNeedsSubstitutionLead}
          </p>
          <ul className="text-muted-foreground mt-2 list-inside list-disc text-[11px]">
            {summary.externalExecution.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {integrityReasons.length > 0 ? (
        <div className="border-border mb-3 rounded-md border border-dashed p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <ul className="text-foreground space-y-1 text-xs leading-snug">
              {integrityReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {hasVolatile && volatile ? (
        <div className="space-y-3 text-xs">
          {volatile.affectedAreas.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1 font-semibold uppercase">
                {C.changeImpactAffected}
              </p>
              <ul className="text-foreground list-inside list-disc space-y-1">
                {volatile.affectedAreas.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {volatile.stillValid.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1 font-semibold uppercase">
                {C.changeImpactStillValid}
              </p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1">
                {volatile.stillValid.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {volatile.mustRevisit.length > 0 ? (
            <div>
              <p className="text-muted-foreground mb-1 font-semibold uppercase">
                {C.changeImpactRevisit}
              </p>
              <ul className="text-foreground list-inside list-disc space-y-1">
                {volatile.mustRevisit.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ci?.evaluatedAt ? (
            <p className="text-muted-foreground text-[10px]">
              {C.changeImpactEvaluatedLabel}{" "}
              {new Date(ci.evaluatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : null}

      {subs.length > 0 ? (
        <div className={cn(hasVolatile ? "mt-4 border-t pt-3" : "")}>
          <div className="mb-2 flex items-center gap-2">
            <ListTree className="text-primary h-4 w-4 shrink-0" />
            <p className="text-muted-foreground text-[10px] font-semibold uppercase">
              {C.changeImpactSubstitutionLogHeading}
            </p>
          </div>
          <ul className="space-y-2 text-xs">
            {subs.map((s, i) => (
              <li
                key={`${s.at}-${i}`}
                className="border-border bg-muted/20 rounded-md border p-2"
              >
                <p className="text-muted-foreground text-[10px]">
                  {new Date(s.at).toLocaleString()} · {s.kind}
                </p>
                <p className="text-foreground mt-1 leading-snug">{s.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onActionComplete ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-[11px] font-semibold"
            onClick={() => onActionComplete()}
          >
            {C.changeImpactRefreshSnapshotCta}
          </button>
          <span className="text-muted-foreground text-[11px] leading-snug">
            {C.changeImpactRefreshSnapshotHint}
          </span>
        </div>
      ) : null}
    </section>
  );
}
