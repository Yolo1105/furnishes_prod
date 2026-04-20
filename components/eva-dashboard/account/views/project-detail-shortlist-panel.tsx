"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import type { ShortlistItemExternalLifecycle } from "@prisma/client";
import { apiDelete, apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import type { ProjectShortlistRow } from "@/lib/eva/projects/api-types";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import { formatMoney, type Currency } from "@/lib/site/money";
import { Button, useToast } from "@/components/eva-dashboard/account/shared";
import {
  PHASE_7_UI_COPY,
  PROJECT_SHORTLIST_STATUS_LABEL,
  SHORTLIST_EXTERNAL_LIFECYCLE_LABEL,
  SHORTLIST_EXTERNAL_LIFECYCLE_SELECT_ORDER,
} from "@/lib/eva/projects/summary-constants";

function priceLabel(cents: number, currency: string) {
  const c = ["SGD", "MYR", "USD"].includes(currency)
    ? (currency as Currency)
    : "SGD";
  return formatMoney(cents, c);
}

export function ProjectDetailShortlistPanel({
  projectId,
  items,
  onChanged,
}: {
  projectId: string;
  items: ProjectShortlistRow[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateExternalLifecycle(
    id: string,
    externalLifecycle: ShortlistItemExternalLifecycle,
  ) {
    setBusyId(id);
    try {
      await apiPatch(API_ROUTES.projectShortlistItem(projectId, id), {
        externalLifecycle,
      });
      toast.success("Procurement state updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(
    id: string,
    status: ProjectShortlistRow["status"],
  ) {
    setBusyId(id);
    try {
      await apiPatch(API_ROUTES.projectShortlistItem(projectId, id), {
        status,
      });
      toast.success("Shortlist updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  }

  async function saveNotes(id: string, notes: string) {
    setBusyId(id);
    try {
      await apiPatch(API_ROUTES.projectShortlistItem(projectId, id), {
        notes: notes.trim() || null,
      });
      toast.success("Notes saved");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save notes");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await apiDelete(API_ROUTES.projectShortlistItem(projectId, id));
      toast.success("Removed from shortlist");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p
        className="text-muted-foreground text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        Nothing on this project&apos;s shortlist yet — add recommendations from
        the Eva workspace (Recommendations) while this project is active.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((s) => (
        <li
          key={s.id}
          className="border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {s.productName}
              </div>
              <div
                className="mt-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                {s.productCategory}
              </div>
              <div
                className="mt-2 text-sm font-medium tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {priceLabel(s.priceCents, s.currency)}
              </div>
              {(s.reasonSelected ?? s.rationale) ? (
                <p
                  className="mt-2 text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <span
                    className="font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    Why it&apos;s here:{" "}
                  </span>
                  {(s.reasonSelected ?? s.rationale)!.trim()}
                </p>
              ) : null}
              {s.summary ? (
                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {s.summary}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <label className="sr-only" htmlFor={`sl-status-${s.id}`}>
                {PHASE_7_UI_COPY.shortlistDesignRoleLabel}
              </label>
              <select
                id={`sl-status-${s.id}`}
                className="border-border bg-background text-foreground rounded border px-2 py-1 text-xs"
                value={s.status}
                disabled={busyId === s.id}
                onChange={(e) =>
                  updateStatus(
                    s.id,
                    e.target.value as ProjectShortlistRow["status"],
                  )
                }
              >
                {(
                  Object.keys(PROJECT_SHORTLIST_STATUS_LABEL) as Array<
                    keyof typeof PROJECT_SHORTLIST_STATUS_LABEL
                  >
                ).map((k) => (
                  <option key={k} value={k}>
                    {PROJECT_SHORTLIST_STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
              <label
                className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase"
                htmlFor={`sl-ext-${s.id}`}
                style={{ color: "var(--muted-foreground)" }}
              >
                {PHASE_7_UI_COPY.shortlistProcurementLabel}
              </label>
              <select
                id={`sl-ext-${s.id}`}
                className="border-border bg-background text-foreground max-w-[11rem] rounded border px-2 py-1 text-xs"
                value={s.externalLifecycle}
                disabled={busyId === s.id}
                onChange={(e) =>
                  updateExternalLifecycle(
                    s.id,
                    e.target.value as ShortlistItemExternalLifecycle,
                  )
                }
              >
                {SHORTLIST_EXTERNAL_LIFECYCLE_SELECT_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {SHORTLIST_EXTERNAL_LIFECYCLE_LABEL[k]}
                  </option>
                ))}
              </select>
              <Link
                href={accountPaths.shortlistItem(s.id)}
                className="text-primary text-[11px] underline"
              >
                {PHASE_7_UI_COPY.shortlistOpenDetail}
              </Link>
            </div>
          </div>
          <NotesEditor
            key={`${s.id}-${s.updatedAt}`}
            rowId={s.id}
            initialNotes={s.notes ?? ""}
            disabled={busyId === s.id}
            onSave={(text) => saveNotes(s.id, text)}
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive h-8 gap-1 text-xs"
              disabled={busyId === s.id}
              onClick={() => remove(s.id)}
            >
              {busyId === s.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NotesEditor({
  rowId,
  initialNotes,
  disabled,
  onSave,
}: {
  rowId: string;
  initialNotes: string;
  disabled: boolean;
  onSave: (notes: string) => void;
}) {
  const [value, setValue] = useState(initialNotes);
  const dirty = value !== initialNotes;
  const fieldId = `sl-notes-${rowId}`;

  return (
    <div className="mt-3">
      <label
        className="text-muted-foreground mb-1 block text-[10px] font-semibold tracking-[0.16em] uppercase"
        htmlFor={fieldId}
      >
        {PHASE_7_UI_COPY.shortlistNotesLabel}
      </label>
      <textarea
        id={fieldId}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        className="border-border bg-background text-foreground w-full rounded border px-2 py-1.5 text-xs"
      />
      {dirty ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-2 h-8 text-xs"
          disabled={disabled}
          onClick={() => onSave(value)}
        >
          Save notes
        </Button>
      ) : null}
    </div>
  );
}
