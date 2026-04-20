"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Palette,
  Gauge,
  BookHeart,
  MessagesSquare,
  FolderKanban,
  Eye,
  RotateCcw,
  ArrowUpRight,
  Filter,
  ListChecks,
  Check,
  type LucideIcon,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  Button,
  LinkButton,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { saveStyleProfileAction } from "@/lib/actions/style";
import { relativeTime } from "@/lib/site/account/formatters";
import {
  EMPTY_STYLE_PROFILE,
  getStyleArchetypes,
} from "@/lib/site/account/style-archetypes";
import type { StyleProfile } from "@/lib/site/account/types";

export type StyleProfileInitial = {
  styleKey: string;
  name: string;
  tagline: string;
  description: string;
  palette: string[];
  keywords: string[];
  takenAt: string;
};

function initialToProfile(row: StyleProfileInitial | null): StyleProfile {
  if (!row) return { ...EMPTY_STYLE_PROFILE };
  return {
    key: row.styleKey as StyleProfile["key"],
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    palette: row.palette,
    keywords: row.keywords,
    takenAt: row.takenAt,
  };
}

/**
 * Style Profile view — enriched with:
 *   - Hero (identity + palette + tagline + quote)
 *   - Evidence strip (what Eva learned from)
 *   - Mood-board mini-grid (sensory snapshot of the palette)
 *   - Compare grid (your archetype vs the other 4)
 *   - "How Eva uses this" pillars
 */
export function StyleView({
  initial,
}: {
  initial: StyleProfileInitial | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<StyleProfile>(() =>
    initialToProfile(initial),
  );
  const archetypes = getStyleArchetypes();
  const otherArchetypes = archetypes.filter((a) => a.key !== profile.key);
  const { toast } = useToast();

  useEffect(() => {
    setProfile(initialToProfile(initial));
  }, [initial]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-6 sm:px-8 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="STYLE PROFILE"
        title="Your design language"
        subtitle={
          profile.takenAt
            ? `Taken ${relativeTime(profile.takenAt)} — re-take anytime to refresh.`
            : "Take the quiz to lock in your design language — Eva uses this everywhere."
        }
        actions={
          <>
            <Button
              variant="primary"
              disabled={isPending || !profile.takenAt}
              onClick={() => {
                startTransition(async () => {
                  const res = await saveStyleProfileAction({
                    styleKey: profile.key,
                    name: profile.name,
                    tagline: profile.tagline,
                    description: profile.description,
                    palette: profile.palette,
                    keywords: profile.keywords,
                  });
                  if (res.ok) {
                    toast.success("Style profile saved");
                    router.refresh();
                  } else {
                    toast.error(res.error);
                  }
                });
              }}
              icon={<Check className="h-3.5 w-3.5" />}
            >
              Save profile
            </Button>
            <Link
              href="/quiz"
              className="font-ui inline-flex h-9 items-center gap-2 border px-3.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors"
              style={{
                background: "var(--card)",
                color: "var(--foreground)",
                borderColor: "var(--border-strong)",
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-take quiz
            </Link>
          </>
        }
      />

      {/* ── Hero + mood-board grid ─────────────────────────── */}
      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Hero */}
        <article
          className="border p-6 md:p-8"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>YOUR PROFILE</Eyebrow>
          <h2
            className="font-display mt-4 text-[36px] md:text-[40px]"
            style={{ color: "var(--foreground)" }}
          >
            {profile.name}
          </h2>
          <p
            className="font-body mt-2 max-w-md text-base italic"
            style={{ color: "var(--muted-foreground)" }}
          >
            "{profile.tagline}"
          </p>
          <p
            className="font-body mt-4 max-w-lg text-sm"
            style={{ color: "var(--foreground)" }}
          >
            {profile.description}
          </p>

          {/* Palette */}
          <div className="mt-5">
            <Eyebrow>PALETTE</Eyebrow>
            <div className="mt-2 flex gap-2">
              {profile.palette.map((hex) => (
                <div key={hex} className="flex flex-col items-start">
                  <span
                    className="h-10 w-14 border"
                    style={{ background: hex, borderColor: "var(--border)" }}
                    aria-label={hex}
                  />
                  <span
                    className="font-ui mt-1 text-[9px] tracking-wider tabular-nums"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {hex.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyword chips */}
          <div className="mt-5 flex flex-wrap gap-1.5">
            {profile.keywords.map((k) => (
              <span
                key={k}
                className="font-ui border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase"
                style={{
                  background: "var(--accent-soft)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                {k}
              </span>
            ))}
          </div>
        </article>

        {/* Mood-board mini-grid */}
        <article
          className="border p-5"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>MOOD BOARD</Eyebrow>
          <p
            className="font-body mt-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            A sensory snapshot of the materials, surfaces, and moods inside your
            profile.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {MOOD_TILES.map((m, i) => (
              <MoodTile
                key={i}
                label={m.label}
                hue={m.hue}
                light={m.light}
                chroma={m.chroma}
              />
            ))}
          </div>
        </article>
      </section>

      {/* ── Evidence strip ─────────────────────────────────── */}
      <section className="mb-5">
        <SectionCard padding="lg" tone="soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow>WHY EVA CALLS YOU THIS</Eyebrow>
              <p
                className="font-body mt-1 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                The strongest signals behind your profile — each linked to the
                source so you can verify.
              </p>
            </div>
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {EVIDENCE.map((e, i) => {
              const Icon = e.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <div
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center border"
                    style={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--primary)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-body text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {e.text}
                    </p>
                    <Link
                      href={e.href}
                      className="font-ui mt-1 inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase transition-opacity hover:opacity-70"
                      style={{ color: "var(--primary)" }}
                    >
                      {e.sourceLabel}
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </section>

      {/* ── Compare ────────────────────────────────────────── */}
      <section className="mb-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <Eyebrow>COMPARE</Eyebrow>
            <h3
              className="font-ui mt-1 text-base"
              style={{ color: "var(--foreground)" }}
            >
              How your profile differs from the others
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          {/* Your archetype — large card */}
          <article
            className="border p-5"
            style={{
              background: "var(--card)",
              borderColor: "var(--primary)",
            }}
          >
            <div className="flex items-center gap-2">
              <Eyebrow>YOU</Eyebrow>
            </div>
            <h4
              className="font-display mt-3 text-2xl"
              style={{ color: "var(--foreground)" }}
            >
              {profile.name}
            </h4>
            <p
              className="font-body mt-2 text-sm italic"
              style={{ color: "var(--muted-foreground)" }}
            >
              "{profile.tagline}"
            </p>
            <div className="mt-4 flex gap-1">
              {profile.palette.slice(0, 5).map((hex) => (
                <span
                  key={hex}
                  className="h-4 w-10"
                  style={{ background: hex }}
                />
              ))}
            </div>
          </article>

          {/* Other 4 — 2x2 grid of small cards */}
          <div className="grid grid-cols-2 gap-3">
            {otherArchetypes.map((a) => (
              <article
                key={a.key}
                className="group border p-4 transition-colors"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <h5
                  className="font-ui text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  {a.name}
                </h5>
                <p
                  className="font-body mt-1 text-[11px] leading-snug italic"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  "{a.tagline}"
                </p>
                <div className="mt-3 flex gap-0.5">
                  {a.palette.slice(0, 5).map((hex) => (
                    <span
                      key={hex}
                      className="h-2.5 w-6"
                      style={{ background: hex }}
                    />
                  ))}
                </div>
                <p
                  className="font-body mt-3 text-[11px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {a.differs}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Eva uses this ──────────────────────────────── */}
      <section>
        <SectionCard padding="lg">
          <Eyebrow>HOW EVA USES THIS</Eyebrow>
          <p
            className="font-body mt-2 max-w-xl text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Your style profile is the foundation everything else rests on. Three
            places you'll see it at work:
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Pillar
              icon={Filter}
              title="Filters collections"
              body="Eva narrows Collections down to pieces that fit your language — not everything, just what matters."
              link="/collections"
              linkLabel="Browse"
            />
            <Pillar
              icon={MessagesSquare}
              title="Anchors conversations"
              body="Eva doesn't start from zero every time. She picks up where your style leaves off."
              link="/chatbot"
              linkLabel="Chat with Eva"
            />
            <Pillar
              icon={ListChecks}
              title="Shapes your shortlist"
              body="Every saved piece carries a short rationale tying it back to your profile."
              link="/account/shortlist"
              linkLabel="View shortlist"
            />
          </div>
        </SectionCard>
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

const MOOD_TILES = [
  { label: "Clay", hue: 30, light: 0.72, chroma: 0.08 },
  { label: "Linen", hue: 60, light: 0.88, chroma: 0.05 },
  { label: "Oak", hue: 45, light: 0.55, chroma: 0.1 },
  { label: "Sage", hue: 120, light: 0.62, chroma: 0.06 },
  { label: "Wheat", hue: 80, light: 0.78, chroma: 0.07 },
  { label: "Cream", hue: 55, light: 0.92, chroma: 0.04 },
];

function MoodTile({
  label,
  hue,
  light,
  chroma,
}: {
  label: string;
  hue: number;
  light: number;
  chroma: number;
}) {
  return (
    <div
      className="relative flex aspect-square items-end justify-start border p-2"
      style={{
        background: `oklch(${light} ${chroma} ${hue})`,
        borderColor: "var(--border)",
      }}
    >
      <span
        className="font-ui text-[9.5px] tracking-[0.14em] uppercase"
        style={{
          color: light > 0.7 ? "var(--foreground)" : "#FEFDFB",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const EVIDENCE: {
  icon: LucideIcon;
  text: string;
  sourceLabel: string;
  href: string;
}[] = [
  {
    icon: Palette,
    text: 'You used "earth tones" in 4 recent conversations with Eva.',
    sourceLabel: "Review conversations",
    href: "/account/conversations",
  },
  {
    icon: BookHeart,
    text: "You've saved pieces in undyed wool, boucle linen, and solid oak — never synthetics.",
    sourceLabel: "See shortlist",
    href: "/account/shortlist",
  },
  {
    icon: Gauge,
    text: "Quiz result: 78% leaning toward Scandinavian-Japandi over Industrial or Maximalist.",
    sourceLabel: "Re-take quiz",
    href: "#",
  },
  {
    icon: FolderKanban,
    text: "Your active project 'Tampines Condo' has a room brief centered on natural textures.",
    sourceLabel: "View project",
    href: "/account/projects",
  },
];

function Pillar({
  icon: Icon,
  title,
  body,
  link,
  linkLabel,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  link: string;
  linkLabel: string;
}) {
  return (
    <div>
      <div
        className="inline-flex h-8 w-8 items-center justify-center border"
        style={{
          background: "var(--accent-soft)",
          borderColor: "var(--border)",
          color: "var(--primary)",
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h4
        className="font-ui mt-3 text-sm"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </h4>
      <p
        className="font-body mt-1 text-xs leading-relaxed"
        style={{ color: "var(--muted-foreground)" }}
      >
        {body}
      </p>
      <Link
        href={link}
        className="font-ui mt-2 inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
        style={{ color: "var(--primary)" }}
      >
        {linkLabel}
        <ArrowUpRight className="h-2.5 w-2.5" />
      </Link>
    </div>
  );
}
