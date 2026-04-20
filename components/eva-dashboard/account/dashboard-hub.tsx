"use client";

import Link from "next/link";
import {
  Sparkles,
  MessageSquarePlus,
  Compass,
  ArrowUpRight,
  MessageSquare,
  Heart,
  FolderKanban,
  Image as ImageIcon,
  PiggyBank,
  Gauge,
  Activity as ActivityIcon,
  type LucideIcon,
} from "lucide-react";
import { Eyebrow } from "./shared";

/** Scroll when content is tall; scrollbars hidden via `.eva-dashboard-root` in account-theme.css */
const dashboardCardScroll =
  "min-h-0 max-h-[min(28rem,calc(100dvh-11rem))] overflow-y-auto overscroll-y-contain";

type Counts = {
  conversations: number;
  shortlist: number;
  projects: number;
  uploads: number;
  cart?: number;
};

type StyleProfileSnippet = {
  name?: string;
  tagline?: string;
  palette?: string[];
  hasTaken: boolean;
};

type Usage = {
  used: number;
  limit: number;
  plan: "FREE" | "PRO" | "STUDIO+";
};

/**
 * Dashboard — compact 4-zone composition.
 *
 * Density tuned to match the reference:
 *   - outer py-6 (not py-8+)
 *   - zone gap-4 (not 5-6)
 *   - card padding p-5 (not p-6)
 *   - H1 28-32px (not 38)
 */
export function DashboardHub({
  userName = "friend",
  greeting = "Welcome back",
  counts,
  styleProfile,
  usage = { used: 0, limit: 100, plan: "FREE" },
  hasBudget = false,
  budgetLabel,
  lastActivityLabel,
}: {
  userName?: string;
  greeting?: string;
  counts: Counts;
  styleProfile: StyleProfileSnippet;
  usage?: Usage;
  hasBudget?: boolean;
  budgetLabel?: string;
  lastActivityLabel?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-6 sm:px-8 md:py-8 lg:px-10">
      {/* ─── Zone A — Greeting + CTAs ─────────────────────────── */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Eyebrow>DASHBOARD</Eyebrow>
          <h1
            className="font-display mt-2 text-[28px] md:text-[32px]"
            style={{ color: "var(--foreground)" }}
          >
            {greeting}, {userName}.
          </h1>
          <p
            className="font-body mt-1.5 max-w-xl text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Your design profile, conversations, projects, and saved pieces — in
            one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/chatbot"
            className="font-ui inline-flex h-9 items-center gap-2 border px-3.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderColor: "var(--primary)",
            }}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New conversation
          </Link>
          <Link
            href="/collections"
            className="font-ui inline-flex h-9 items-center gap-2 border px-3.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
              borderColor: "var(--border-strong)",
            }}
          >
            <Compass className="h-3.5 w-3.5" />
            Browse collections
          </Link>
        </div>
      </header>

      {/* ─── Zone B — Hero band ────────────────────────────────── */}
      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Style profile hero — matches reference image layout */}
        <article
          className={`relative border p-6 md:p-8 ${dashboardCardScroll}`}
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>STYLE PROFILE</Eyebrow>

          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <h2
                className="font-display text-[32px] md:text-[36px]"
                style={{ color: "var(--foreground)" }}
              >
                {styleProfile.hasTaken
                  ? (styleProfile.name ?? "Your design language")
                  : "Discover your design language"}
              </h2>
              <p
                className="font-body mt-3 max-w-lg text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {styleProfile.hasTaken
                  ? styleProfile.tagline ||
                    "Anchors every recommendation, conversation, and shortlist from here on."
                  : "Take the Style Explorer to surface a profile that anchors every recommendation, conversation, and shortlist from here on."}
              </p>
            </div>

            <Link
              href={styleProfile.hasTaken ? "/account/style" : "/quiz"}
              className="font-ui inline-flex h-10 shrink-0 items-center gap-2 self-start border px-4 text-[10.5px] tracking-[0.14em] uppercase transition-colors md:self-center"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderColor: "var(--primary)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {styleProfile.hasTaken ? "Open profile" : "Start the quiz"}
            </Link>
          </div>

          {/* Palette swatch row — small, bottom-left */}
          <div className="mt-6 flex gap-1">
            {(
              styleProfile.palette ?? [
                "#DDD5C4",
                "#B09470",
                "#6B7355",
                "#3D4A30",
                "#D9C9A3",
              ]
            ).map((hex) => (
              <span
                key={hex}
                className="h-2 w-14"
                style={{ background: hex }}
                aria-label={hex}
              />
            ))}
          </div>
        </article>

        {/* Eva continuation card */}
        <article
          className={`flex flex-col border p-6 md:p-8 ${dashboardCardScroll}`}
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>EVA</Eyebrow>
          <h3
            className="font-display mt-4 text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Continue with Eva
          </h3>
          <p
            className="font-body mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Pick up where you left off, or start a fresh thread.
          </p>

          <div className="mt-auto pt-6">
            <Link
              href="/chatbot"
              className="font-ui flex h-10 w-full items-center justify-center gap-2 border text-[10.5px] tracking-[0.18em] uppercase transition-colors"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderColor: "var(--primary)",
              }}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New conversation
            </Link>
          </div>
        </article>
      </section>

      {/* ─── Zone C — 4 status cards ───────────────────────────── */}
      <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          eyebrow="DIALOGUE"
          count={counts.conversations}
          unitLabel="conversations"
          title="Conversations"
          emptyBody="No conversations yet — start one with Eva."
          populatedBody="Tap to continue a thread or start fresh."
          href="/account/conversations"
          Icon={MessageSquare}
        />
        <StatusCard
          eyebrow="SAVED"
          count={counts.shortlist}
          unitLabel=""
          title="Shortlist"
          emptyBody="Shortlist is empty — save pieces from Collections."
          populatedBody="Grouped by project. Open to review or move."
          href="/account/shortlist"
          Icon={Heart}
        />
        <StatusCard
          eyebrow="WORKSPACES"
          count={counts.projects}
          unitLabel=""
          title="Projects"
          emptyBody="No projects yet — group your work into a renovation or room."
          populatedBody="Jump into planning, sourcing, or review."
          href="/account/projects"
          Icon={FolderKanban}
        />
        <StatusCard
          eyebrow="ROOM PHOTOS"
          count={counts.uploads}
          unitLabel=""
          title="Uploads"
          emptyBody="Drop a room photo into Eva to begin."
          populatedBody="Eva's analyses are attached to each photo."
          href="/account/uploads"
          Icon={ImageIcon}
        />
      </section>

      {/* ─── Zone D — Utility row (3 cards) ──────────────────── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <UtilityCard
          eyebrow="BUDGET"
          title="Budget"
          body={
            hasBudget
              ? `${budgetLabel ?? "Set"} — filters every recommendation.`
              : "Share a budget range so Eva and Collections filter to pieces that fit."
          }
          ctaLabel={hasBudget ? "Manage budget" : "Take the budget quiz"}
          href="/account/budget"
          Icon={PiggyBank}
        />
        <UtilityCard
          eyebrow="USAGE"
          title="Eva plan"
          pill={usage.plan}
          body={
            <>
              <div className="font-ui flex items-baseline justify-between text-xs tabular-nums">
                <span style={{ color: "var(--foreground)" }}>
                  {usage.used} / {usage.limit}
                </span>
                <span style={{ color: "var(--muted-foreground)" }}>
                  {Math.round((usage.used / usage.limit) * 100)}%
                </span>
              </div>
              <div
                className="mt-2 h-1 w-full overflow-hidden"
                style={{ background: "var(--muted)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, (usage.used / usage.limit) * 100)}%`,
                    background: "var(--primary)",
                  }}
                />
              </div>
            </>
          }
          ctaLabel="Manage plan"
          href="/account/billing"
          Icon={Gauge}
        />
        <UtilityCard
          eyebrow="LEDGER"
          title="Recent activity"
          body={lastActivityLabel ?? "Nothing here yet."}
          ctaLabel="Full activity log"
          href="/account/activity"
          Icon={ActivityIcon}
        />
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function StatusCard({
  eyebrow,
  count,
  unitLabel,
  title,
  emptyBody,
  populatedBody,
  href,
  Icon,
}: {
  eyebrow: string;
  count: number;
  unitLabel: string;
  title: string;
  emptyBody: string;
  populatedBody: string;
  href: string;
  Icon: LucideIcon;
}) {
  const populated = count > 0;
  return (
    <Link
      href={href}
      className={`group flex h-full min-h-0 flex-col border p-4 transition-colors ${dashboardCardScroll}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      <div className="flex items-start justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        <ArrowUpRight
          className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span
          className="font-display text-[36px] leading-none tabular-nums"
          style={{ color: "var(--foreground)" }}
        >
          {count}
        </span>
        {unitLabel && (
          <span
            className="font-body text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            {unitLabel}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div
          className="font-ui flex items-center gap-1.5 text-sm"
          style={{ color: "var(--foreground)" }}
        >
          <Icon
            className="h-3.5 w-3.5"
            style={{ color: "var(--muted-foreground)" }}
          />
          {title}
        </div>
        <p
          className="font-body mt-1 text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {populated ? populatedBody : emptyBody}
        </p>
      </div>
    </Link>
  );
}

function UtilityCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  href,
  Icon,
  pill,
}: {
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  ctaLabel: string;
  href: string;
  Icon: LucideIcon;
  pill?: string;
}) {
  return (
    <article
      className={`flex h-full min-h-0 flex-col border p-4 ${dashboardCardScroll}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Icon
          className="h-3.5 w-3.5"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <h4 className="font-ui text-sm" style={{ color: "var(--foreground)" }}>
          {title}
        </h4>
        {pill && (
          <span
            className="font-ui inline-flex items-center border px-1.5 py-0.5 text-[9px] tracking-[0.18em] uppercase"
            style={{
              borderColor: "var(--border-strong)",
              color: "var(--muted-foreground)",
            }}
          >
            {pill}
          </span>
        )}
      </div>

      <div
        className="font-body mt-1.5 flex-1 text-xs leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        {body}
      </div>

      <Link
        href={href}
        className="font-ui mt-3 inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
        style={{ color: "var(--primary)" }}
      >
        {ctaLabel}
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </article>
  );
}
