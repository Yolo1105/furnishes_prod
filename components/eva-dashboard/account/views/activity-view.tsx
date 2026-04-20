"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LogIn,
  User,
  ListChecks,
  FolderKanban,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  Receipt,
  Heart,
  Activity as ActivityIcon,
  ArrowUpRight,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  FilterBar,
  SearchInput,
  SegmentedFilter,
  EmptyState,
  SectionCard,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/formatters";
import type { ActivityEvent, ActivityCategory } from "@/lib/site/account/types";

const CAT_META: Record<
  ActivityCategory,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  "sign-in": { icon: LogIn, tone: "text-primary bg-primary/10" },
  profile: { icon: User, tone: "text-foreground bg-muted" },
  preferences: { icon: ListChecks, tone: "text-accent bg-accent/10" },
  project: { icon: FolderKanban, tone: "text-primary bg-primary/10" },
  upload: { icon: ImageIcon, tone: "text-foreground bg-muted" },
  conversation: { icon: MessageSquare, tone: "text-accent bg-accent/10" },
  security: { icon: ShieldCheck, tone: "text-destructive bg-destructive/10" },
  billing: { icon: Receipt, tone: "text-foreground bg-muted" },
  shortlist: { icon: Heart, tone: "text-accent bg-accent/10" },
};

type Filter = "all" | ActivityCategory;

export function ActivityView({ initial }: { initial: ActivityEvent[] }) {
  const [events] = useState<ActivityEvent[]>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return events.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (
        n &&
        !(e.label + " " + (e.description ?? "")).toLowerCase().includes(n)
      )
        return false;
      return true;
    });
  }, [events, q, filter]);

  // Group by day bucket
  const groups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86_400_000);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);

    const buckets: { label: string; items: ActivityEvent[] }[] = [
      { label: "TODAY", items: [] },
      { label: "YESTERDAY", items: [] },
      { label: "THIS WEEK", items: [] },
      { label: "EARLIER", items: [] },
    ];

    filtered.forEach((e) => {
      const d = new Date(e.at);
      if (d >= today) buckets[0]!.items.push(e);
      else if (d >= yesterday) buckets[1]!.items.push(e);
      else if (d >= weekAgo) buckets[2]!.items.push(e);
      else buckets[3]!.items.push(e);
    });

    return buckets.filter((b) => b.items.length > 0);
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="LEDGER"
        title="Everything you've done"
        subtitle="Chronological record of account, project, preference, and security events. Stored for 90 days."
      />

      <PreviewBanner />

      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search activity…"
          className="min-w-0 flex-1"
        />
        <SegmentedFilter
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: events.length },
            { value: "project", label: "Projects" },
            { value: "preferences", label: "Prefs" },
            { value: "security", label: "Security" },
          ]}
        />
      </FilterBar>

      {groups.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title={
            events.length === 0
              ? "No activity yet"
              : "Nothing matches this filter"
          }
          body={
            events.length === 0
              ? "Actions on your account will show up here as they are logged."
              : "Try clearing filters or widening the search."
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 flex items-center gap-3">
                <Eyebrow>{group.label}</Eyebrow>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {group.items.length}
                </span>
              </div>

              <SectionCard padding="none">
                <ul className="list-none">
                  {group.items.map((e, rowIndex) => {
                    const meta = CAT_META[e.category];
                    const Icon = meta.icon;
                    const Wrapper = e.href ? Link : "div";
                    const wrapperProps = e.href
                      ? {
                          href: e.href,
                          className:
                            "block hover:bg-muted/30 transition-colors",
                        }
                      : { className: "block" };
                    return (
                      <li
                        key={e.id}
                        style={
                          rowIndex > 0
                            ? { borderTop: "1px solid var(--border)" }
                            : undefined
                        }
                      >
                        {/* @ts-expect-error — Wrapper is polymorphic between Link and div */}
                        <Wrapper {...wrapperProps}>
                          <div className="flex items-start gap-3 px-4 py-3">
                            <div
                              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-3">
                                <div className="text-foreground text-sm font-medium">
                                  {e.label}
                                </div>
                                <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                  {relativeTime(e.at)}
                                </div>
                              </div>
                              {e.description && (
                                <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                  {e.description}
                                </div>
                              )}
                            </div>
                            {e.href && (
                              <ArrowUpRight className="text-muted-foreground mt-1 h-3.5 w-3.5 shrink-0" />
                            )}
                          </div>
                        </Wrapper>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
