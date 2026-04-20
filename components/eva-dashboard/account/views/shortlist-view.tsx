"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, List, Trash2, FolderKanban, ExternalLink } from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  FilterBar,
  SegmentedFilter,
  SearchInput,
  EmptyState,
  LinkButton,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import {
  removeFromShortlistAction,
  moveShortlistItemAction,
} from "@/lib/actions/shortlist";
import { relativeTime } from "@/lib/site/account/mock-data";
import { formatSGD } from "@/lib/site/money";
import type { ShortlistItem } from "@/lib/site/account/types";

type View = "grid" | "list";

export function ShortlistView({
  initial,
  projects,
}: {
  initial: ShortlistItem[];
  projects: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<ShortlistItem[]>(initial);
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("grid");
  const { toast } = useToast();

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return items;
    return items.filter(
      (i) =>
        i.productName.toLowerCase().includes(n) ||
        i.productCategory.toLowerCase().includes(n) ||
        (i.projectName?.toLowerCase().includes(n) ?? false),
    );
  }, [items, q]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { label: string; projectId: string | null; items: ShortlistItem[] }
    >();
    filtered.forEach((i) => {
      const key = i.projectId ?? "__unassigned";
      if (!map.has(key)) {
        map.set(key, {
          label: i.projectName ?? "Unassigned",
          projectId: i.projectId,
          items: [],
        });
      }
      map.get(key)!.items.push(i);
    });
    return Array.from(map.values());
  }, [filtered]);

  const removeItem = (id: string) => {
    const prev = items;
    setItems((list) => list.filter((i) => i.id !== id));
    startTransition(async () => {
      const res = await removeFromShortlistAction(id);
      if (!res.ok) {
        setItems(prev);
        toast.error(res.error);
        return;
      }
      toast.success("Removed from shortlist");
      router.refresh();
    });
  };

  const moveItem = (itemId: string, projectId: string | null) => {
    const prev = items;
    const project = projects.find((p) => p.id === projectId);
    setItems((list) =>
      list.map((i) =>
        i.id === itemId
          ? {
              ...i,
              projectId,
              projectName: project ? project.title : null,
            }
          : i,
      ),
    );
    startTransition(async () => {
      const res = await moveShortlistItemAction(itemId, projectId);
      if (!res.ok) {
        setItems(prev);
        toast.error(res.error);
        return;
      }
      toast.success("Moved");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="SAVED"
        title="Saved pieces"
        subtitle={`${items.length} items saved across ${new Set(items.map((i) => i.projectId)).size} projects.`}
        actions={
          <LinkButton href="/collections" variant="primary">
            Browse collections
          </LinkButton>
        }
      />

      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search shortlist…"
          className="min-w-0 flex-1"
        />
        <SegmentedFilter
          value={view}
          onChange={setView}
          options={[
            { value: "grid", label: "Grid" },
            { value: "list", label: "List" },
          ]}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your shortlist is quiet"
          body="Save pieces you love from Collections — they'll appear here, grouped by project."
          cta={
            <LinkButton href="/collections" variant="primary">
              Browse collections
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.label}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <Eyebrow>PROJECT</Eyebrow>
                  <h3 className="text-foreground mt-1 flex items-center gap-2 text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
                    <FolderKanban className="text-muted-foreground h-4 w-4" />
                    {group.label}
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {group.items.length}
                    </span>
                  </h3>
                </div>
                {group.projectId && (
                  <Link
                    href={`/account/projects/${group.projectId}`}
                    className="text-primary inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] uppercase hover:underline"
                  >
                    View project
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {view === "grid" ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((item) => (
                    <ShortlistCard
                      key={item.id}
                      item={item}
                      projects={projects}
                      busy={isPending}
                      onRemove={() => removeItem(item.id)}
                      onMove={(projectId) => moveItem(item.id, projectId)}
                    />
                  ))}
                </div>
              ) : (
                <SectionCard padding="none">
                  <div className="divide-border divide-y">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="hover:bg-muted/30 flex flex-wrap items-center gap-4 p-3 transition-colors"
                      >
                        <Link
                          href={`/account/shortlist/${item.id}`}
                          className="flex min-w-0 flex-1 items-center gap-4"
                        >
                          <div
                            className="border-border h-14 w-14 shrink-0 border"
                            style={{
                              background: `linear-gradient(135deg, oklch(0.85 0.08 ${item.coverHue}), oklch(0.65 0.12 ${item.coverHue}))`,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-foreground truncate text-sm font-medium">
                              {item.productName}
                            </div>
                            <div className="text-muted-foreground mt-0.5 text-xs">
                              {item.productCategory} · Saved{" "}
                              {relativeTime(item.createdAt)}
                            </div>
                          </div>
                        </Link>
                        <div className="text-foreground shrink-0 text-sm font-medium tabular-nums">
                          {formatSGD(item.priceCents)}
                        </div>
                        <select
                          className="border-border bg-card text-foreground max-w-[140px] shrink-0 border px-2 py-1 text-[10px] font-medium uppercase"
                          value={item.projectId ?? ""}
                          disabled={isPending}
                          onChange={(e) => {
                            const v = e.target.value;
                            moveItem(item.id, v === "" ? null : v);
                          }}
                          aria-label="Move to project"
                        >
                          <option value="">Unassigned</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive inline-flex h-8 w-8 items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ShortlistCard({
  item,
  projects,
  busy,
  onRemove,
  onMove,
}: {
  item: ShortlistItem;
  projects: { id: string; title: string }[];
  busy: boolean;
  onRemove: () => void;
  onMove: (projectId: string | null) => void;
}) {
  return (
    <div className="group border-border bg-card hover:border-primary/40 relative overflow-hidden border transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <Link
        href={`/account/shortlist/${item.id}`}
        className="block text-left no-underline"
        aria-label={`Open ${item.productName}`}
      >
        <div
          className="aspect-[4/5] w-full"
          style={{
            background: `linear-gradient(135deg, oklch(0.88 0.08 ${item.coverHue}) 0%, oklch(0.58 0.14 ${item.coverHue}) 100%)`,
          }}
        />
        <div className="p-3">
          <div className="text-muted-foreground text-[9px] font-semibold tracking-[0.16em] uppercase">
            {item.productCategory}
          </div>
          <div className="text-foreground mt-1 line-clamp-2 text-sm leading-snug font-medium">
            {item.productName}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-foreground text-sm font-medium tabular-nums">
              {formatSGD(item.priceCents)}
            </span>
            <span className="text-muted-foreground text-[10px]">
              {relativeTime(item.createdAt)}
            </span>
          </div>
        </div>
      </Link>

      <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="bg-card/95 border-border flex gap-1 border p-1 shadow-sm backdrop-blur-sm">
          <select
            className="border-border bg-card text-foreground max-w-[100px] border px-1 py-0.5 text-[9px] font-medium uppercase"
            value={item.projectId ?? ""}
            disabled={busy}
            onClick={(e) => e.preventDefault()}
            onChange={(e) => {
              const v = e.target.value;
              onMove(v === "" ? null : v);
            }}
            aria-label="Move to project"
          >
            <option value="">Move…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove"
            className="hover:bg-destructive/10 hover:text-destructive text-foreground inline-flex h-7 w-7 items-center justify-center transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
