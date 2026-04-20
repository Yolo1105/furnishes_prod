"use client";

import { useCallback, useState } from "react";
import {
  ProjectApprovalDecisionStatus,
  ProjectApprovalTargetType,
} from "@prisma/client";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import {
  PROJECT_APPROVAL_MILESTONE_LABEL,
  PROJECT_COLLABORATION_COPY,
} from "@/lib/eva/projects/summary-constants";
import { apiPost, API_ROUTES } from "@/lib/eva-dashboard/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MILESTONE_KEYS: readonly ProjectApprovalTargetType[] = [
  "preferred_direction",
  "shortlist",
  "execution_package",
  "handoff_export",
] as const;

type Props = {
  projectId: string;
  summary: ProjectSummaryDto;
  className?: string;
  onApprovalsUpdated?: () => void;
};

function statusBadge(status: string) {
  switch (status) {
    case "none":
      return "bg-muted text-muted-foreground";
    case "approved":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
    case "rejected":
      return "bg-red-500/15 text-red-800 dark:text-red-200";
    case "pending":
      return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
    case "revoked":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function ProjectMilestoneApprovalsPanel({
  projectId,
  summary,
  className,
  onApprovalsUpdated,
}: Props) {
  const [noteByType, setNoteByType] = useState<Partial<Record<string, string>>>(
    {},
  );
  const [busy, setBusy] = useState<ProjectApprovalTargetType | null>(null);

  const rowFor = useCallback(
    (targetType: ProjectApprovalTargetType) =>
      summary.collaboration.milestoneApprovals.find(
        (a) => a.targetType === targetType && a.targetId === "",
      ),
    [summary.collaboration.milestoneApprovals],
  );

  const upsert = useCallback(
    async (
      targetType: ProjectApprovalTargetType,
      status: ProjectApprovalDecisionStatus,
    ) => {
      setBusy(targetType);
      try {
        const noteRaw = noteByType[targetType]?.trim();
        await apiPost(API_ROUTES.projectApprovals(projectId), {
          targetType,
          targetId: "",
          status,
          note: noteRaw ? noteRaw : null,
        });
        toast.success("Approval updated");
        onApprovalsUpdated?.();
      } catch {
        toast.error("Could not update approval");
      } finally {
        setBusy(null);
      }
    },
    [noteByType, onApprovalsUpdated, projectId],
  );

  return (
    <section
      className={cn("border-border bg-card rounded-lg border p-4", className)}
    >
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {PROJECT_COLLABORATION_COPY.collaborationSectionEyebrow} · milestones
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Lightweight checkpoints for direction, shortlist, execution package, and
        handoff — request review or record a decision. Export stays blocked
        while comments are open or any milestone here is still pending.
      </p>

      <ul className="mt-3 space-y-3">
        {MILESTONE_KEYS.map((targetType) => {
          const row = rowFor(targetType);
          const status = row?.status ?? "none";
          const label = PROJECT_APPROVAL_MILESTONE_LABEL[targetType];
          return (
            <li
              key={targetType}
              className="border-border flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground text-sm font-medium">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                      statusBadge(status),
                    )}
                  >
                    {status === "none"
                      ? "No decision yet"
                      : status.replace(/_/g, " ")}
                  </span>
                </div>
                <textarea
                  className="border-border bg-background text-foreground mt-2 max-w-md rounded border px-2 py-1 text-[11px]"
                  rows={2}
                  placeholder="Optional note (e.g. what should change)"
                  value={noteByType[targetType] ?? ""}
                  onChange={(e) =>
                    setNoteByType((prev) => ({
                      ...prev,
                      [targetType]: e.target.value,
                    }))
                  }
                />
                {row?.decidedAt &&
                (status === "approved" || status === "rejected") ? (
                  <p className="text-muted-foreground mt-1 text-[10px]">
                    Decision recorded {new Date(row.decidedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-1.5">
                <button
                  type="button"
                  className="rounded border border-dashed px-2 py-1 text-[10px] font-medium disabled:opacity-50"
                  disabled={busy === targetType}
                  onClick={() =>
                    void upsert(
                      targetType,
                      ProjectApprovalDecisionStatus.pending,
                    )
                  }
                >
                  Request review
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-600/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  disabled={busy === targetType}
                  onClick={() =>
                    void upsert(
                      targetType,
                      ProjectApprovalDecisionStatus.approved,
                    )
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="bg-destructive/90 text-destructive-foreground hover:bg-destructive rounded px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
                  disabled={busy === targetType}
                  onClick={() =>
                    void upsert(
                      targetType,
                      ProjectApprovalDecisionStatus.rejected,
                    )
                  }
                >
                  Needs changes
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
