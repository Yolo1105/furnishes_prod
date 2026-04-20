"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Upload as UploadIcon, ImageIcon } from "lucide-react";
import {
  PageHeader,
  FilterBar,
  SearchInput,
  SegmentedFilter,
  EmptyState,
  LinkButton,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/formatters";
import type { Upload } from "@/lib/site/account/types";

type Sort = "newest" | "oldest";

export function UploadsView({ initial }: { initial: Upload[] }) {
  const [uploads] = useState<Upload[]>(initial);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const rooms = useMemo(
    () => Array.from(new Set(uploads.map((u) => u.room))),
    [uploads],
  );

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    let list = uploads;
    if (n) {
      list = list.filter(
        (u) =>
          u.filename.toLowerCase().includes(n) ||
          u.room.toLowerCase().includes(n) ||
          u.analysis.toLowerCase().includes(n),
      );
    }
    list = [...list].sort((a, b) => {
      const diff =
        new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      return sort === "newest" ? -diff : diff;
    });
    return list;
  }, [uploads, q, sort]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="ROOM PHOTOS"
        title="Uploads"
        subtitle="Photos you've shared with Eva — with her analysis attached."
        meta={
          rooms.length > 0 ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
              {rooms.map((r) => (
                <span
                  key={r}
                  className="border-border bg-card border px-2 py-0.5 tracking-wider uppercase"
                >
                  {r}
                </span>
              ))}
            </div>
          ) : null
        }
        actions={
          <LinkButton
            href="/chatbot"
            variant="primary"
            icon={<UploadIcon className="h-3.5 w-3.5" />}
          >
            Share in Eva
          </LinkButton>
        }
      />

      <PreviewBanner />

      <FilterBar>
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search by room, filename, analysis…"
          className="min-w-0 flex-1"
        />
        <SegmentedFilter
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos uploaded"
          body="Upload a room photo in Eva — analyses appear here once saved to your account."
          cta={
            <LinkButton href="/chatbot" variant="primary">
              Open Eva
            </LinkButton>
          }
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
          {filtered.map((u) => (
            <UploadCard
              key={u.id}
              upload={u}
              href={`/account/uploads/${u.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadCard({ upload, href }: { upload: Upload; href: string }) {
  return (
    <Link
      href={href}
      className="group border-border bg-card hover:border-primary/40 block w-full overflow-hidden border text-left transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
    >
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${upload.width} / ${upload.height}`,
          background: `linear-gradient(135deg, oklch(0.88 0.08 ${upload.coverHue}) 0%, oklch(0.58 0.14 ${upload.coverHue}) 100%)`,
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/40 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-[10px] font-semibold tracking-[0.18em] text-white uppercase">
            {upload.room}
          </span>
          <span className="text-[10px] text-white/80">
            {relativeTime(upload.uploadedAt)}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="text-foreground truncate text-xs font-medium">
          {upload.filename}
        </div>
        <div className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-snug">
          {upload.analysis}
        </div>
      </div>
    </Link>
  );
}
