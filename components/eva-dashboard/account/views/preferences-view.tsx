"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Home,
  PiggyBank,
  Layers,
  Heart,
  Ban,
  Pencil,
  Check,
  Trash2,
  Eraser,
  ExternalLink,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  Button,
  StatusBadge,
  EmptyState,
  RightInspector,
  ConfirmDialog,
  Field,
  Textarea,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import {
  confirmPreferenceAction,
  forgetAllPreferencesAction,
  forgetPreferenceAction,
  updatePreferenceAction,
} from "@/lib/actions/preferences";
import { relativeTime } from "@/lib/site/account/formatters";
import type { UserPreference, PreferenceGroup } from "@/lib/site/account/types";

type GroupMeta = {
  key: PreferenceGroup;
  eyebrow: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const GROUPS: GroupMeta[] = [
  {
    key: "style",
    eyebrow: "STYLE",
    label: "Style",
    description: "The design language you gravitate toward.",
    icon: Sparkles,
  },
  {
    key: "room",
    eyebrow: "ROOMS",
    label: "Rooms",
    description: "Which spaces you're working on.",
    icon: Home,
  },
  {
    key: "budget",
    eyebrow: "BUDGET",
    label: "Budget",
    description: "Price ceilings Eva respects when recommending.",
    icon: PiggyBank,
  },
  {
    key: "materials",
    eyebrow: "MATERIALS",
    label: "Materials",
    description: "The finishes that attract you.",
    icon: Layers,
  },
  {
    key: "musthaves",
    eyebrow: "MUST-HAVES",
    label: "Must-haves",
    description: "Non-negotiables Eva must include.",
    icon: Heart,
  },
  {
    key: "dealbreakers",
    eyebrow: "DEAL-BREAKERS",
    label: "Deal-breakers",
    description: "Things Eva will never recommend to you.",
    icon: Ban,
  },
];

export function PreferencesView({
  initial = [],
}: {
  initial?: UserPreference[];
} = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [prefs, setPrefs] = useState<UserPreference[]>(() => initial);
  const [editing, setEditing] = useState<UserPreference | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [confirmForgetAll, setConfirmForgetAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initial !== undefined) setPrefs(initial);
  }, [initial]);

  // Group preferences
  const byGroup = useMemo(() => {
    const map = new Map<PreferenceGroup, UserPreference[]>();
    for (const g of GROUPS) map.set(g.key, []);
    for (const p of prefs) {
      const bucket = map.get(p.group);
      if (bucket) bucket.push(p);
    }
    return map;
  }, [prefs]);

  // Stats
  const total = prefs.length;
  const confirmed = prefs.filter((p) => p.status === "confirmed").length;
  const potential = prefs.filter((p) => p.status === "potential").length;
  const lastUpdated = prefs.reduce<string | null>((latest, p) => {
    if (!latest || new Date(p.updatedAt) > new Date(latest)) return p.updatedAt;
    return latest;
  }, null);

  const startEdit = (p: UserPreference) => {
    setEditing(p);
    setDraftValue(p.value);
  };

  const saveEdit = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await updatePreferenceAction(editing.id, {
        value: draftValue,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPrefs((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? { ...p, value: draftValue, updatedAt: new Date().toISOString() }
            : p,
        ),
      );
      toast.success("Memory updated");
      setEditing(null);
      router.refresh();
    });
  };

  const confirm = (id: string) => {
    startTransition(async () => {
      const res = await confirmPreferenceAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPrefs((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "confirmed" as const,
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
      toast.success("Confirmed");
      router.refresh();
    });
  };

  const forget = (id: string) => {
    startTransition(async () => {
      const res = await forgetPreferenceAction(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPrefs((prev) => prev.filter((p) => p.id !== id));
      toast.info("Forgotten");
      router.refresh();
    });
  };

  const forgetAll = () => {
    startTransition(async () => {
      const res = await forgetAllPreferencesAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPrefs([]);
      toast.info(
        `Removed ${res.data.count} preference${res.data.count === 1 ? "" : "s"}`,
      );
      setConfirmForgetAll(false);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-6 sm:px-8 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="MEMORY"
        title="What Eva remembers about you"
        subtitle="Everything Eva has learned from conversations, uploads, and your Style Profile. Confirm, edit, or forget anything."
      />

      {/* ── Top summary strip — 4 stat tiles ────────────────── */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile eyebrow="TOTAL" value={total} label="preferences" />
        <StatTile
          eyebrow="CONFIRMED"
          value={confirmed}
          label="locked in"
          accent
        />
        <StatTile
          eyebrow="POTENTIAL"
          value={potential}
          label="awaiting review"
        />
        <StatTile
          eyebrow="LAST LEARNED"
          value={lastUpdated ? relativeTime(lastUpdated) : "—"}
          label="since update"
          valueAsText
        />
      </section>

      {/* ── Groups ───────────────────────────────────────────── */}
      <div className="space-y-6">
        {GROUPS.map((group) => {
          const items = byGroup.get(group.key) ?? [];
          return (
            <GroupSection
              key={group.key}
              group={group}
              items={items}
              onEdit={startEdit}
              onConfirm={confirm}
              onForget={forget}
            />
          );
        })}
      </div>

      {/* ── Cross-links + danger zone footer ─────────────────── */}
      <div
        className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href="/account/style"
          className="font-ui inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
          style={{ color: "var(--primary)" }}
        >
          <Sparkles className="h-3 w-3" />
          See your style profile
          <ArrowUpRight className="h-3 w-3" />
        </Link>

        <button
          type="button"
          onClick={() => setConfirmForgetAll(true)}
          className="font-ui inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
          style={{ color: "var(--destructive)" }}
        >
          <Eraser className="h-3 w-3" />
          Forget everything
        </button>
      </div>

      {/* Edit inspector */}
      <RightInspector
        open={!!editing}
        onClose={() => setEditing(null)}
        eyebrow="EDIT MEMORY"
        title={editing?.field ?? ""}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEdit} disabled={isPending}>
              Save
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Value" htmlFor="draft-value">
              <Textarea
                id="draft-value"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                rows={4}
              />
            </Field>
            {editing.sourceConversationTitle && (
              <div
                className="border p-3"
                style={{
                  background: "var(--card-soft)",
                  borderColor: "var(--border)",
                }}
              >
                <Eyebrow>LEARNED FROM</Eyebrow>
                <p
                  className="font-body mt-2 text-xs"
                  style={{ color: "var(--foreground)" }}
                >
                  Eva inferred this from your conversation{" "}
                  <span
                    className="font-ui"
                    style={{ color: "var(--foreground)" }}
                  >
                    "{editing.sourceConversationTitle}"
                  </span>
                  . Editing the value here doesn't change the conversation.
                </p>
              </div>
            )}
          </div>
        )}
      </RightInspector>

      <ConfirmDialog
        open={confirmForgetAll}
        onClose={() => setConfirmForgetAll(false)}
        onConfirm={forgetAll}
        title="Forget everything?"
        body="Eva will start from scratch — your Style Profile and ongoing conversations will still inform future suggestions, but nothing listed here will carry over."
        confirmLabel="Forget all"
        destructive
      />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function StatTile({
  eyebrow,
  value,
  label,
  accent,
  valueAsText,
}: {
  eyebrow: string;
  value: number | string;
  label: string;
  accent?: boolean;
  valueAsText?: boolean;
}) {
  return (
    <article
      className="border p-4"
      style={{
        background: "var(--card-soft)",
        borderColor: "var(--border)",
      }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <div
        className="font-display mt-2 tabular-nums"
        style={{
          color: accent ? "var(--primary)" : "var(--foreground)",
          fontSize: valueAsText ? "18px" : "28px",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        className="font-body mt-1 text-[11px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </div>
    </article>
  );
}

function GroupSection({
  group,
  items,
  onEdit,
  onConfirm,
  onForget,
}: {
  group: GroupMeta;
  items: UserPreference[];
  onEdit: (p: UserPreference) => void;
  onConfirm: (id: string) => void;
  onForget: (id: string) => void;
}) {
  const Icon = group.icon;

  return (
    <section>
      {/* Group header */}
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="inline-flex h-8 w-8 items-center justify-center border"
            style={{
              background: "var(--accent-soft)",
              borderColor: "var(--border)",
              color: "var(--primary)",
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <Eyebrow>{group.eyebrow}</Eyebrow>
              <span
                className="font-ui text-[10px] tabular-nums"
                style={{ color: "var(--muted-foreground)" }}
              >
                {items.length.toString().padStart(2, "0")}
              </span>
            </div>
            <p
              className="font-body mt-0.5 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {group.description}
            </p>
          </div>
        </div>
      </header>

      {/* Items or empty skeleton */}
      {items.length === 0 ? (
        <article
          className="border border-dashed p-4"
          style={{
            borderColor: "var(--border-strong)",
            background: "var(--card-soft)",
          }}
        >
          <p
            className="font-body text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Nothing learned yet. Chat with Eva to fill this in, or set it
            manually.
          </p>
        </article>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((p) => (
            <PreferenceCard
              key={p.id}
              preference={p}
              Icon={Icon}
              onEdit={() => onEdit(p)}
              onConfirm={() => onConfirm(p.id)}
              onForget={() => onForget(p.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PreferenceCard({
  preference,
  Icon,
  onEdit,
  onConfirm,
  onForget,
}: {
  preference: UserPreference;
  Icon: LucideIcon;
  onEdit: () => void;
  onConfirm: () => void;
  onForget: () => void;
}) {
  return (
    <article
      className="flex flex-col border p-4"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Top — field label + status */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ color: "var(--muted-foreground)" }}
          />
          <div
            className="font-ui text-[11px] tracking-[0.08em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            {preference.field}
          </div>
        </div>
        <StatusBadge
          variant={preference.status === "confirmed" ? "ok" : "warn"}
        >
          {preference.status === "confirmed" ? "CONFIRMED" : "POTENTIAL"}
        </StatusBadge>
      </header>

      {/* Value */}
      <p
        className="font-body mt-3 text-sm leading-snug"
        style={{ color: "var(--foreground)" }}
      >
        "{preference.value}"
      </p>

      {/* Confidence bar — 4 segments */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span
            className="font-ui text-[9.5px] tracking-[0.16em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Confidence
          </span>
          <span
            className="font-ui text-[11px] tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {Math.round(preference.confidence * 100)}%
          </span>
        </div>
        <ConfidenceBar value={preference.confidence} />
      </div>

      {/* Source conversation chip */}
      {preference.sourceConversationTitle &&
        preference.sourceConversationId && (
          <Link
            href={`/account/conversations/${preference.sourceConversationId}`}
            className="font-ui mt-3 inline-flex items-center gap-1.5 self-start border px-2 py-1 text-[10px] tracking-[0.12em] uppercase transition-colors"
            style={{
              background: "var(--card-soft)",
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {preference.sourceConversationTitle}
          </Link>
        )}

      {/* Footer — action row */}
      <footer
        className="mt-4 flex items-center justify-between border-t pt-3"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="font-ui text-[10px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {relativeTime(preference.updatedAt)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="inline-flex h-7 w-7 items-center justify-center transition-opacity hover:opacity-60"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Pencil className="h-3 w-3" />
          </button>
          {preference.status === "potential" && (
            <button
              type="button"
              onClick={onConfirm}
              aria-label="Confirm"
              className="inline-flex h-7 w-7 items-center justify-center transition-opacity hover:opacity-60"
              style={{ color: "var(--primary)" }}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onForget}
            aria-label="Forget"
            className="inline-flex h-7 w-7 items-center justify-center transition-colors hover:text-[var(--destructive)]"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </footer>
    </article>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  // 4-segment stepped bar
  const segs = 4;
  const filled = Math.ceil(value * segs);
  return (
    <div className="mt-1.5 flex gap-0.5">
      {Array.from({ length: segs }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1"
          style={{
            background: i < filled ? "var(--primary)" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}
