"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { pathForAccountView } from "@/features/account/shell/account-view-paths";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

const PALETTE = ["#E4D5BE", "#C8A87C", "#9C7C57", "#5E5141", "#2A1E14"];

const MOOD: Array<{ label: string; bg: string; light: boolean }> = [
  { label: "Clay", bg: "oklch(0.72 0.08 30)", light: false },
  { label: "Linen", bg: "oklch(0.88 0.05 60)", light: false },
  { label: "Oak", bg: "oklch(0.55 0.1 45)", light: true },
  { label: "Sage", bg: "oklch(0.62 0.06 120)", light: true },
  { label: "Wheat", bg: "oklch(0.78 0.07 80)", light: false },
  { label: "Cream", bg: "oklch(0.92 0.04 55)", light: false },
];

type EvidenceItem = {
  text: string;
  go: string;
  view: string;
  navigable?: boolean;
};

const EVIDENCE: EvidenceItem[] = [
  {
    text: "You used “earth tones” in 4 recent conversations with Eva.",
    go: "Review conversations ↗",
    view: "conversations",
  },
  {
    text: "You’ve saved pieces in undyed wool, boucle linen, and solid oak, never synthetics.",
    go: "See shortlist ↗",
    view: "shortlist",
  },
  {
    text: "Quiz result: 78% leaning Scandinavian-Japandi over Industrial or Maximalist.",
    go: "Re-take quiz ↗",
    view: "style",
    navigable: false,
  },
  {
    text: "Your project “Tampines HDB” has a profile centered on natural textures.",
    go: "View project ↗",
    view: "projects",
  },
];

type ArchItem = { name: string; quote: string; desc: string; colors: string[] };

const ADJACENT: ArchItem[] = [
  {
    name: "The Collector",
    quote: "“A room should tell the whole story.”",
    desc: "You layer natural textures; the Collector layers stories. Both warm, differently loud.",
    colors: ["#A8451F", "#9C7C57", "#D8CBB0", "#3A2A1C", "#D9C06A"],
  },
  {
    name: "The Naturalist",
    quote: "“Living things are the best furniture.”",
    desc: "A different answer to the same question: how should a room feel?",
    colors: ["#6E7E55", "#9C8A6A", "#D8CFB8", "#37452C", "#C9C39A"],
  },
  {
    name: "The Structuralist",
    quote: "“Honest material. Honest form.”",
    desc: "You soften rooms with living materials; Structuralists leave structure exposed.",
    colors: ["#6E7E66", "#86A0A6", "#C2A57C", "#2A2A28", "#CFCBB8"],
  },
  {
    name: "The Maker",
    quote: "“The hand is always visible.”",
    desc: "You favor what grows; Makers favor what’s shaped. Both honor hand and process.",
    colors: ["#9C7C57", "#6E7E55", "#D8CBB0", "#8C3A1F", "#CFC6AE"],
  },
];

type MemoryLine = {
  label: string;
  value: string;
  source: string;
  view: string;
};
type MemoryGroup = { title: string; lines: MemoryLine[] };

const MEMORY: MemoryGroup[] = [
  {
    title: "Style",
    lines: [
      {
        label: "Leaning",
        value: "Warm minimalist · Scandinavian-Japandi",
        source: "from quiz",
        view: "conversations",
      },
      {
        label: "Avoids",
        value: "Glass tables, cool greys, high-gloss",
        source: "from 3 chats",
        view: "conversations",
      },
    ],
  },
  {
    title: "Materials",
    lines: [
      {
        label: "Loves",
        value: "Undyed wool, boucle linen, solid oak",
        source: "from shortlist",
        view: "shortlist",
      },
      {
        label: "Never",
        value: "Synthetics, chrome",
        source: "from shortlist",
        view: "shortlist",
      },
    ],
  },
  {
    title: "Rooms",
    lines: [
      {
        label: "Active",
        value: "Living room, bedroom, home office",
        source: "from projects",
        view: "projects",
      },
    ],
  },
  {
    title: "Must-haves",
    lines: [
      {
        label: "Always",
        value: "Layered warm lighting; one hero piece per room",
        source: "from Eva",
        view: "style",
      },
    ],
  },
  {
    title: "Deal-breakers",
    lines: [
      {
        label: "Won’t do",
        value: "Open kitchen shelving; bar-height dining",
        source: "from 2 chats",
        view: "conversations",
      },
    ],
  },
  {
    title: "Budget",
    lines: [
      {
        label: "Range",
        value: "S$15,000 – S$20,000 across the flat",
        source: "from budget",
        view: "budget",
      },
    ],
  },
];

const PROPERTY_TYPES = ["HDB", "Condo", "Landed", "Rental", "Other"] as const;
type PropertyType = (typeof PROPERTY_TYPES)[number];

const DIMENSIONS: Array<{ label: string; value: string }> = [
  { label: "Main room", value: "4.2 × 3.6 m" },
  { label: "Ceiling height", value: "2.6 m" },
  { label: "Doorway width", value: "0.9 m" },
];

type PillarItem = { title: string; desc: string; go: string; view: string };

const PILLARS: PillarItem[] = [
  {
    title: "Filters collections",
    desc: "Eva narrows Collections to pieces that fit your language, not everything, just what matters.",
    go: "Browse ↗",
    view: "shortlist",
  },
  {
    title: "Anchors conversations",
    desc: "Eva picks up where your style leaves off instead of starting from zero.",
    go: "Chat with Eva ↗",
    view: "chat",
  },
  {
    title: "Shapes your shortlist",
    desc: "Every saved piece carries a short rationale tying it back to your profile.",
    go: "View shortlist ↗",
    view: "shortlist",
  },
];

function WireCell({
  view,
  navigable = true,
  className = "wf-cellbox",
  children,
}: {
  view?: string;
  navigable?: boolean | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (view && navigable) {
    return (
      <Link href={pathForAccountView(view)} className={className}>
        {children}
      </Link>
    );
  }
  if (view) {
    return (
      <button type="button" className={className}>
        {children}
      </button>
    );
  }
  return <div className={className}>{children}</div>;
}

function WireSectionBand({
  label,
  title,
  intro,
}: {
  label: string;
  title: string;
  intro: string;
}) {
  return (
    <div className="wf-cellbox wf-cellbox--band" style={{ gridColumn: "1/-1" }}>
      <p className="wf-sec__lbl" style={{ margin: "0 0 9px" }}>
        {label}
      </p>
      <div className="wf-band__h">{title}</div>
      <p className="wf-led__intro">{intro}</p>
    </div>
  );
}

/**
 * Route-owned Style Profile page — exact studio markup/classes, real Links.
 * Persisted: property type (and hero labels from styleWords / displayName).
 * Deferred (design fixtures, no fake persistence): palette, mood board,
 * evidence cards, adjacent tastes, memory lines, Re-take quiz.
 */
export function StylePage({
  initialPropertyType = "HDB",
  heroLabel = "Warm Minimalist",
  heroSummary = "Natural materials, low clutter, soft contrast, mid-century leaning with muted earth tones.",
}: {
  initialPropertyType?: PropertyType;
  heroLabel?: string;
  heroSummary?: string;
}) {
  const router = useRouter();
  const [propertyType, setPropertyType] =
    useState<PropertyType>(initialPropertyType);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPropertyType(initialPropertyType);
  }, [initialPropertyType]);

  async function handleSave() {
    setStatus("saving");
    try {
      await accountRequest("/api/account/style", {
        method: "PUT",
        body: JSON.stringify({ preferences: { propertyType } }),
      });
      setStatus("saved");
      // Refresh only after the confirmation has had its window. Refreshing
      // immediately re-renders this subtree from the server and drops the
      // "saved" status before it ever paints, so the save looks like a no-op.
      setTimeout(() => {
        setStatus("idle");
        router.refresh();
      }, 1500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="How Eva Knows Me"
        title="Your design language"
        subtitle="Everything Eva uses to personalize your recommendations, your taste, what she remembers, your budget, and your space."
        actions={
          <>
            <button type="button" className="wf-btn" onClick={handleSave}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.5 8.2L6.4 11l6.1-6.5" />
              </svg>
              Save profile
            </button>
            <button
              type="button"
              className="wf-btn ghost"
              title="Quiz retake is deferred"
              onClick={() => {
                setNotice("Quiz retake deferred");
                window.setTimeout(() => setNotice(null), 1800);
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3.2 6.2a5 5 0 1 1 1.1 5.4" />
                <path d="M3.2 3.2v3h3" />
              </svg>
              Re-take quiz
            </button>
          </>
        }
      />

      <div className="wf-conn wf-conn--top">
        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "1fr" }}
        >
          <div className="wf-cellbox wf-cellbox--hero">
            <div className="wf-2col">
              <div>
                <p className="wf-sec__lbl" style={{ margin: "0 0 10px" }}>
                  Your profile
                </p>
                <div className="wf-cell__t" style={{ fontSize: "28.75px" }}>
                  {heroLabel}
                </div>
                <p
                  className="wf-sub"
                  style={{ marginTop: "8px", maxWidth: "42ch" }}
                >
                  {heroSummary}
                </p>
                <div style={{ marginTop: "18px" }}>
                  <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
                    Palette
                  </p>
                  <div className="wf-pal">
                    {PALETTE.map((hex) => (
                      <span key={hex} style={{ background: hex }}>
                        <small>{hex}</small>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="wf-sec__lbl" style={{ margin: "0 0 13px" }}>
                  Mood board
                </p>
                <div className="wf-mood">
                  {MOOD.map((m) => (
                    <div
                      key={m.label}
                      style={{
                        background: m.bg,
                        color: m.light ? "#FBF0DC" : "var(--ink)",
                      }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
        >
          <WireSectionBand
            label="Why Eva calls you this"
            title="The evidence"
            intro="The signals behind this label, each one traceable to something you actually did."
          />
          {EVIDENCE.map((item) => (
            <WireCell
              key={item.text}
              view={item.view}
              navigable={item.navigable}
            >
              <div className="wf-evi__tx">{item.text}</div>
              <div className="wf-cellbox__go">{item.go}</div>
            </WireCell>
          ))}
        </div>

        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
        >
          <WireSectionBand
            label="How your profile differs from the others"
            title="Adjacent tastes"
            intro="Profiles that sit next to yours, close enough to compare, different enough to show what you’re not."
          />
          {ADJACENT.map((item) => (
            <div className="wf-cellbox" key={item.name}>
              <div className="wf-cellbox__t">{item.name}</div>
              <div className="wf-arch__q">{item.quote}</div>
              <div className="wf-cellbox__sw">
                {item.colors.map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </div>
              <div className="wf-cellbox__d">{item.desc}</div>
            </div>
          ))}
        </div>

        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
        >
          <WireSectionBand
            label="What Eva remembers"
            title="The fine print"
            intro="The granular taste signals behind your profile, each linked to where Eva learned it. Correct anything that’s off."
          />
          {MEMORY.map((group) => (
            <div className="wf-cellbox" key={group.title}>
              <div className="wf-cellbox__t">{group.title}</div>
              {group.lines.map((line) => (
                <div className="wf-memline" key={line.label}>
                  <b>{line.label}</b>
                  <span className="wf-memline__v">{line.value}</span>
                  <Link
                    href={pathForAccountView(line.view)}
                    className="wf-memline__s"
                  >
                    {line.source} ↗
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
        >
          <WireSectionBand
            label="About your space"
            title="The room itself"
            intro="So Eva only suggests pieces that physically fit your home."
          />
          <div className="wf-cellbox">
            <div className="wf-cellbox__t" style={{ marginBottom: "12px" }}>
              Property type
            </div>
            <div className="wf-choice">
              {PROPERTY_TYPES.map((type) => (
                <span
                  key={type}
                  className={propertyType === type ? "on" : undefined}
                  onClick={() => setPropertyType(type)}
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
          <div className="wf-cellbox">
            <div className="wf-cellbox__t" style={{ marginBottom: "4px" }}>
              Dimensions
            </div>
            {DIMENSIONS.map((d) => (
              <div className="wf-field" key={d.label}>
                <span className="wf-field__lbl">{d.label}</span>
                <span className="wf-field__val">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}
        >
          <WireSectionBand
            label="How Eva uses this"
            title="Put to work"
            intro="Where this profile quietly shapes what Furnishes shows you."
          />
          {PILLARS.map((p) => (
            <WireCell key={p.title} view={p.view}>
              <div className="wf-cellbox__t">{p.title}</div>
              <div className="wf-cellbox__d">{p.desc}</div>
              <div className="wf-cellbox__go">{p.go}</div>
            </WireCell>
          ))}
        </div>
      </div>

      <div
        className={`wf-toast${
          status === "saved" || status === "error" || notice ? " show" : ""
        }`}
      >
        {status === "saved"
          ? "Saved ✓"
          : status === "error"
            ? "Could not save your profile — please try again."
            : notice
              ? notice
              : ""}
      </div>
    </AccountWireFrame>
  );
}
