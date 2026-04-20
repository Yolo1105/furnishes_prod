"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import {
  DECISION_CONTEXT_LIMITS,
  type ProjectDecisionContext,
} from "@/lib/eva/projects/decision-schemas";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PROJECT_SUMMARY_COPY } from "@/lib/eva/projects/summary-constants";
import Link from "next/link";

type Props = {
  projectId: string;
  summary: ProjectSummaryDto;
  onSaved: () => void;
  className?: string;
};

export function ProjectDecisionPanel({
  projectId,
  summary,
  onSaved,
  className,
}: Props) {
  const [notes, setNotes] = useState(
    () => summary.decisionContext?.decisionNotes ?? "",
  );
  const [constraints, setConstraints] = useState<string[]>(
    () => summary.decisionContext?.acceptedConstraints ?? [],
  );
  const [constraintDraft, setConstraintDraft] = useState("");
  const [followUps, setFollowUps] = useState<string[]>(
    () => summary.decisionContext?.supplementaryOpenItems ?? [],
  );
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    return new Set(summary.decisionContext?.favoriteArtifactIds ?? []);
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const decisionSig = JSON.stringify(summary.decisionContext ?? null);
  useEffect(() => {
    const d = summary.decisionContext;
    setNotes(d?.decisionNotes ?? "");
    setConstraints(d?.acceptedConstraints ?? []);
    setFollowUps(d?.supplementaryOpenItems ?? []);
    setFavoriteIds(new Set(d?.favoriteArtifactIds ?? []));
  }, [decisionSig, summary.projectId]);

  function addFollowUp() {
    const t = followUpDraft.trim();
    if (!t) return;
    if (followUps.length >= DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItems)
      return;
    if (followUps.includes(t)) {
      setFollowUpDraft("");
      return;
    }
    setFollowUps((c) => [...c, t]);
    setFollowUpDraft("");
  }

  function addConstraint() {
    const t = constraintDraft.trim();
    if (!t) return;
    if (constraints.length >= DECISION_CONTEXT_LIMITS.maxConstraintStrings)
      return;
    if (constraints.includes(t)) {
      setConstraintDraft("");
      return;
    }
    setConstraints((c) => [...c, t]);
    setConstraintDraft("");
  }

  function toggleFavorite(artifactId: string) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(artifactId)) next.delete(artifactId);
      else if (next.size < DECISION_CONTEXT_LIMITS.maxFavoriteArtifactIds)
        next.add(artifactId);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    const mergeBase = summary.decisionContext ?? {};
    const next: ProjectDecisionContext = {
      ...mergeBase,
      decisionNotes: notes.trim() ? notes.trim() : undefined,
      acceptedConstraints:
        constraints.length > 0
          ? constraints.map((c) => c.trim()).filter(Boolean)
          : undefined,
      supplementaryOpenItems:
        followUps.length > 0
          ? followUps.map((c) => c.trim()).filter(Boolean)
          : undefined,
      favoriteArtifactIds:
        favoriteIds.size > 0 ? Array.from(favoriteIds) : undefined,
    };
    try {
      await apiPatch(API_ROUTES.project(projectId), {
        decisionContext: next,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const artifactChoices = summary.artifacts.all.slice(
    0,
    DECISION_CONTEXT_LIMITS.artifactPickerVisibleMax,
  );

  return (
    <div
      className={cn(
        "border-border bg-muted/10 space-y-4 rounded-lg border p-4",
        className,
      )}
    >
      <div>
        <p className="text-foreground text-sm font-semibold">Edit decision</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Saved to this project and included in JSON/HTML handoff.
        </p>
      </div>

      <div>
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Decision notes
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Capture agreements, tradeoffs, or what you still need to validate —
          included in JSON/HTML handoff.
        </p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Prefer natural oak; sofa must stay under 220cm…"
          className="mt-2 min-h-[88px] text-sm"
          maxLength={DECISION_CONTEXT_LIMITS.maxDecisionNotesChars}
        />
      </div>

      <div>
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Accepted constraints
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Short bullets you are treating as fixed for this project.
        </p>
        <ul className="mt-2 space-y-1.5">
          {constraints.map((c, i) => (
            <li
              key={`${c}-${i}`}
              className="bg-background flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs"
            >
              <span className="text-foreground min-w-0 flex-1">{c}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() =>
                  setConstraints((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="Remove constraint"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <Input
            value={constraintDraft}
            onChange={(e) => setConstraintDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addConstraint();
              }
            }}
            placeholder="Add a constraint"
            className="h-9 text-sm"
            maxLength={DECISION_CONTEXT_LIMITS.maxConstraintStringChars}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 shrink-0"
            onClick={addConstraint}
            disabled={
              constraints.length >= DECISION_CONTEXT_LIMITS.maxConstraintStrings
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <p className="text-muted-foreground text-[10px] font-semibold uppercase">
          Your follow-ups (optional)
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Track questions or blockers you want to remember — listed under “Your
          follow-ups” in the summary (up to{" "}
          {DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItems}).
        </p>
        <ul className="mt-2 space-y-1.5">
          {followUps.map((c, i) => (
            <li
              key={`${c}-${i}`}
              className="bg-background flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs"
            >
              <span className="text-foreground min-w-0 flex-1">{c}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() =>
                  setFollowUps((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="Remove follow-up"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <Input
            value={followUpDraft}
            onChange={(e) => setFollowUpDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFollowUp();
              }
            }}
            placeholder="e.g. Confirm sofa depth with contractor"
            className="h-9 text-sm"
            maxLength={DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItemChars}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 shrink-0"
            onClick={addFollowUp}
            disabled={
              followUps.length >=
              DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItems
            }
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {artifactChoices.length > 0 ? (
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase">
            Starred project files
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Star files to emphasize them in highlights and exports (up to{" "}
            {DECISION_CONTEXT_LIMITS.maxFavoriteArtifactIds}).
          </p>
          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {artifactChoices.map((a) => {
              const on = favoriteIds.has(a.id);
              return (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-2 rounded border px-2 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-foreground font-medium">
                      {a.title}
                    </span>
                    <span className="text-muted-foreground ml-1">
                      · {a.fileType}
                    </span>
                    <Link
                      href={accountPaths.conversation(a.conversationId)}
                      className="text-primary mt-0.5 block truncate text-[11px] underline"
                    >
                      {PROJECT_SUMMARY_COPY.openChat}
                    </Link>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded p-1",
                      on ? "text-primary" : "text-muted-foreground",
                    )}
                    onClick={() => toggleFavorite(a.id)}
                    aria-label={on ? "Remove favorite" : "Mark favorite"}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={on ? "currentColor" : "none"}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {err ? <p className="text-destructive text-xs">{err}</p> : null}

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save decision details"
          )}
        </Button>
      </div>
    </div>
  );
}
