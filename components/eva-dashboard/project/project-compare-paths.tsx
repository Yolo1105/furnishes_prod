"use client";

import { useMemo, useState } from "react";
import { compareTwoPaths } from "@/lib/eva/projects/compare-recommendations";
import { COMPARE_OPTION_LABELS } from "@/lib/eva/projects/summary-constants";
import type { ProjectSummaryDto } from "@/lib/eva/projects/api-types";
import type { ProjectDecisionContext } from "@/lib/eva/projects/decision-schemas";
import { apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  summary: ProjectSummaryDto;
  onUpdated: () => void;
  className?: string;
};

type TopRecItem = ProjectSummaryDto["recommendations"]["topItems"][number];

function toDecisionPathItem(i: TopRecItem) {
  return {
    id: i.id,
    title: i.title,
    summary: null,
    category: i.category,
    reasonWhyItFits: i.reasonWhyItFits,
    estimatedPrice: i.estimatedPrice,
  };
}

export function ProjectComparePaths({
  projectId,
  summary,
  onUpdated,
  className,
}: Props) {
  const items = summary.recommendations.topItems;
  const [a, setA] = useState<string[]>([]);
  const [b, setB] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const byId = useMemo(() => {
    const m = new Map(items.map((i) => [i.id, i]));
    return m;
  }, [items]);

  const itemsA = useMemo(
    () => a.map((id) => byId.get(id)).filter(Boolean) as typeof items,
    [a, byId, items],
  );
  const itemsB = useMemo(
    () => b.map((id) => byId.get(id)).filter(Boolean) as typeof items,
    [b, byId, items],
  );

  const comparison = useMemo(() => {
    if (itemsA.length === 0 || itemsB.length === 0) return null;
    return compareTwoPaths(
      COMPARE_OPTION_LABELS.a,
      itemsA,
      COMPARE_OPTION_LABELS.b,
      itemsB,
    );
  }, [itemsA, itemsB]);

  function toggle(target: "a" | "b", id: string) {
    setErr(null);
    if (target === "a") {
      setA((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      setB((prev) => prev.filter((x) => x !== id));
    } else {
      setB((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      setA((prev) => prev.filter((x) => x !== id));
    }
  }

  async function persistPreferred(which: "a" | "b") {
    const pick = which === "a" ? itemsA : itemsB;
    if (pick.length === 0) return;
    setSaving(true);
    setErr(null);
    const base: ProjectDecisionContext = summary.decisionContext ?? {};
    const next: ProjectDecisionContext = {
      ...base,
      preferredPath: {
        label:
          which === "a" ? COMPARE_OPTION_LABELS.a : COMPARE_OPTION_LABELS.b,
        items: pick.map(toDecisionPathItem),
        updatedAt: new Date().toISOString(),
      },
    };
    if (itemsA.length > 0 && itemsB.length > 0) {
      next.comparisonCandidates = [
        {
          id: "compare-a",
          label: COMPARE_OPTION_LABELS.a,
          items: itemsA.map(toDecisionPathItem),
        },
        {
          id: "compare-b",
          label: COMPARE_OPTION_LABELS.b,
          items: itemsB.map(toDecisionPathItem),
        },
      ];
    }
    try {
      await apiPatch(API_ROUTES.project(projectId), {
        decisionContext: next,
      });
      onUpdated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (items.length < 2) {
    return (
      <p className={cn("text-muted-foreground text-xs", className)}>
        Open Recommendations with this project to generate and save at least two
        picks, then return here to compare.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "border-border bg-muted/15 space-y-3 rounded-lg border p-4",
        className,
      )}
    >
      <p className="text-foreground text-sm font-medium">
        Compare two directions
      </p>
      <p className="text-muted-foreground text-xs">
        Tap items to build Option A vs Option B (from your last saved
        recommendation run).
      </p>
      <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
        {items.map((it) => {
          const inA = a.includes(it.id);
          const inB = b.includes(it.id);
          return (
            <li
              key={it.id}
              className="border-border bg-background/80 flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5"
            >
              <span className="text-foreground min-w-0 flex-1">
                <span className="font-medium">{it.title}</span>{" "}
                <span className="text-muted-foreground">({it.category})</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={inA ? "default" : "outline"}
                  className="h-7 px-2 text-[10px]"
                  onClick={() => toggle("a", it.id)}
                >
                  A
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inB ? "default" : "outline"}
                  className="h-7 px-2 text-[10px]"
                  onClick={() => toggle("b", it.id)}
                >
                  B
                </Button>
              </span>
            </li>
          );
        })}
      </ul>

      {comparison ? (
        <div className="border-border bg-background rounded-md border p-3 text-xs leading-relaxed">
          <p className="text-foreground font-medium">Comparison</p>
          <p className="text-muted-foreground mt-1">{comparison.summary}</p>
          {comparison.priceGap ? (
            <p className="text-muted-foreground mt-1">{comparison.priceGap}</p>
          ) : null}
        </div>
      ) : null}

      {err ? <p className="text-destructive text-xs">{err}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving || itemsA.length === 0}
          onClick={() => void persistPreferred("a")}
        >
          {saving ? "Saving…" : "Set Option A as preferred"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving || itemsB.length === 0}
          onClick={() => void persistPreferred("b")}
        >
          {saving ? "Saving…" : "Set Option B as preferred"}
        </Button>
      </div>
    </div>
  );
}
