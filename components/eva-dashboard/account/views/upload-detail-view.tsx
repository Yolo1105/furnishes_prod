"use client";

import Link from "next/link";
import { Image as ImageIcon, Sparkles, FolderKanban } from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/formatters";
import type { Upload } from "@/lib/site/account/types";

export function UploadDetailView({ upload }: { upload: Upload }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        breadcrumbs={[
          { icon: ImageIcon, label: "Uploads", href: "/account/uploads" },
          { label: upload.filename },
        ]}
        title={upload.filename}
        subtitle={upload.room}
      />

      <PreviewBanner />

      <div className="mt-2 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div
          className="w-full overflow-hidden border"
          style={{
            aspectRatio: `${upload.width} / ${upload.height}`,
            borderColor: "var(--border)",
            background: `linear-gradient(135deg, oklch(0.88 0.08 ${upload.coverHue}) 0%, oklch(0.58 0.15 ${upload.coverHue}) 100%)`,
          }}
          aria-label="Room photo preview"
        />

        <div
          className="flex flex-col border p-6 md:p-8"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>{upload.room.toUpperCase()}</Eyebrow>

          <div className="border-border bg-muted/30 mt-4 grid grid-cols-2 gap-3 border p-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-0.5 tracking-wider uppercase">
                Dimensions
              </div>
              <div className="text-foreground tabular-nums">
                {upload.width} × {upload.height}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5 tracking-wider uppercase">
                Uploaded
              </div>
              <div className="text-foreground">
                {relativeTime(upload.uploadedAt)}
              </div>
            </div>
            {upload.linkedConversationId && (
              <div className="col-span-2">
                <div className="text-muted-foreground mb-0.5 tracking-wider uppercase">
                  Conversation
                </div>
                <Link
                  href={`/account/conversations/${encodeURIComponent(upload.linkedConversationId)}`}
                  className="text-foreground text-sm font-medium hover:underline"
                >
                  {upload.linkedConversationTitle ?? "Open thread"}
                </Link>
              </div>
            )}
            {upload.projectId && (
              <div className="col-span-2">
                <div className="text-muted-foreground mb-0.5 tracking-wider uppercase">
                  Project
                </div>
                <Link
                  href={`/account/projects/${upload.projectId}`}
                  className="text-foreground inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  {upload.projectName ?? "Project"}
                </Link>
              </div>
            )}
          </div>

          <p
            className="text-muted-foreground mt-4 text-xs leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            Original files are stored securely; account download is not exposed
            here yet.
          </p>
        </div>
      </div>

      <SectionCard padding="lg" tone="muted" className="mt-5">
        <div className="flex items-start gap-3">
          <div
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border"
            style={{
              background: "var(--primary)",
              borderColor: "var(--border)",
              color: "var(--primary-foreground)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <Eyebrow>EVA&apos;S ANALYSIS</Eyebrow>
            <p
              className="mt-2 text-sm leading-[1.7]"
              style={{ color: "var(--foreground)" }}
            >
              {upload.analysis}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
