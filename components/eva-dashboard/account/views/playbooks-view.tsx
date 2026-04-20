"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, BookOpen, Sparkles, User } from "lucide-react";
import {
  PageHeader,
  SectionCard,
  LinkButton,
  EmptyState,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { getMockPlaybooks, relativeTime } from "@/lib/site/account/mock-data";

export function PlaybooksView() {
  const [playbooks] = useState(getMockPlaybooks());

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="FIELD NOTES"
        title="Reusable design guides"
        subtitle="Eva-generated or written by you — reference material you can open, copy, share, or duplicate."
        actions={
          <LinkButton
            href="/chatbot"
            variant="primary"
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Create playbook
          </LinkButton>
        }
      />

      <PreviewBanner />

      {playbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No playbooks yet"
          body="Ask Eva to save a playbook from a conversation — or write one yourself."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((p) => (
            <Link
              key={p.id}
              href={`/account/playbooks/${encodeURIComponent(p.id)}`}
              className="focus-visible:ring-primary/30 text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
            >
              <SectionCard
                interactive
                padding="none"
                className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[0_4px_20px_rgba(43,31,24,0.08)]"
              >
                {/* Cover */}
                <div
                  className="relative h-32 w-full"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.78 0.12 ${p.coverHue}), oklch(0.58 0.15 ${p.coverHue}))`,
                  }}
                >
                  <div className="absolute inset-0 flex items-end p-4">
                    <span className="inline-flex items-center gap-1 bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.18em] text-white uppercase backdrop-blur-sm">
                      {p.author === "eva" ? (
                        <>
                          <Sparkles className="h-3 w-3" />
                          By Eva
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3" />
                          By you
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-foreground text-base leading-snug font-[var(--font-manrope)] tracking-tight">
                    {p.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 flex-1 text-xs leading-relaxed">
                    {p.summary}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="bg-muted text-muted-foreground px-1.5 py-0.5 text-[9px] font-medium tracking-[0.14em] uppercase"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="border-border mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground text-xs">
                      Updated {relativeTime(p.updatedAt)}
                    </span>
                    <span className="text-primary text-[10px] font-semibold tracking-[0.18em] uppercase">
                      Open →
                    </span>
                  </div>
                </div>
              </SectionCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
