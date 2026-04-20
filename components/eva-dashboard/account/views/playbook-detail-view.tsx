"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  User,
  Clock,
  Copy,
  Share2,
  Download,
  BookOpen,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  Button,
  LinkButton,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import {
  getMockPlaybookById,
  relativeTime,
} from "@/lib/site/account/mock-data";

/**
 * /account/playbooks/[id]
 *
 * Long-read editorial layout.
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ ▀▀▀▀▀▀▀ cover gradient strip ▀▀▀▀▀▀▀                     │
 *   │ [ PLAYBOOK ]                                              │
 *   │ A practical Naturalist living room                         │
 *   │ "Air and soft mass, no more."                              │
 *   │ [by Eva] · 8 min read · Updated 3 days ago                 │
 *   ├──────────────────────────────────────────────────────────┤
 *   │ § The premise                                              │
 *   │ Every room is a conversation…                              │
 *   │ § Anchoring the floor                                      │
 *   │ Start with a rug you could sleep on…                       │
 *   │ …                                                          │
 *   └──────────────────────────────────────────────────────────┘
 */
export function PlaybookDetailView({ id }: { id: string }) {
  const pb = getMockPlaybookById(id);
  const { toast } = useToast();

  if (!pb) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <h1
          className="text-2xl font-[var(--font-manrope)]"
          style={{ color: "var(--foreground)" }}
        >
          Playbook not found
        </h1>
        <LinkButton
          href="/account/playbooks"
          variant="secondary"
          className="mt-6"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back to playbooks
        </LinkButton>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-[880px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        breadcrumbs={[
          { icon: BookOpen, label: "Playbooks", href: "/account/playbooks" },
          { label: pb.title },
        ]}
        title={pb.title}
        subtitle={pb.summary}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.success("Duplicated")}
              icon={<Copy className="h-3.5 w-3.5" />}
            >
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.success("Share link copied")}
              icon={<Share2 className="h-3.5 w-3.5" />}
            >
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.success("Markdown export queued")}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Export
            </Button>
          </>
        }
      />

      <PreviewBanner />

      {/* Cover gradient strip */}
      <div
        className="mt-2 h-32 w-full"
        style={{
          background: `linear-gradient(135deg, oklch(0.78 0.12 ${pb.coverHue}), oklch(0.58 0.15 ${pb.coverHue}))`,
        }}
      />

      {/* Meta + tags */}
      <header
        className="border border-t-0 p-6 md:p-10"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase"
            style={{
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {pb.author === "eva" ? (
              <>
                <Sparkles
                  className="h-2.5 w-2.5"
                  style={{ color: "var(--primary)" }}
                />
                BY EVA
              </>
            ) : (
              <>
                <User className="h-2.5 w-2.5" />
                BY YOU
              </>
            )}
          </span>
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {pb.estReadMinutes} min read
          </span>
          <span className="opacity-40">·</span>
          <span>Updated {relativeTime(pb.updatedAt)}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {pb.tags.map((t) => (
            <span
              key={t}
              className="border px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] uppercase"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </header>

      {/* Sections */}
      <div
        className="border border-t-0"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {pb.sections.map((s, i) => (
          <section
            key={s.id}
            className="border-t p-6 md:p-10"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-baseline gap-3">
              <span
                className="text-xl font-[var(--font-manrope)] tabular-nums"
                style={{ color: "var(--primary)" }}
              >
                §{(i + 1).toString().padStart(2, "0")}
              </span>
              <h2
                className="text-2xl leading-tight font-[var(--font-manrope)] tracking-tight"
                style={{ color: "var(--foreground)" }}
              >
                {s.heading}
              </h2>
            </div>
            <p
              className="mt-3 text-base leading-[1.75]"
              style={{ color: "var(--foreground)" }}
            >
              {s.body}
            </p>
            {s.accent && (
              <div className="mt-4 flex gap-2">
                {s.accent.map((hex) => (
                  <span
                    key={hex}
                    className="inline-block h-10 w-16 border"
                    style={{
                      background: hex,
                      borderColor: "var(--border)",
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Footer CTA */}
      <SectionCard padding="lg" className="mt-5" tone="muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <BookOpen
              className="mt-0.5 h-5 w-5"
              style={{ color: "var(--primary)" }}
            />
            <div>
              <div
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Apply this to your space
              </div>
              <p
                className="mt-1 max-w-xl text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Want Eva to translate this playbook into a specific plan for one
                of your rooms? Open it in a conversation.
              </p>
            </div>
          </div>
          <LinkButton
            href={`/chatbot?playbookId=${encodeURIComponent(pb.id)}`}
            variant="primary"
          >
            Ask Eva to apply it
          </LinkButton>
        </div>
      </SectionCard>
    </article>
  );
}
