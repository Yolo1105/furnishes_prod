"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import type { LatestStudioRoomSaveSummary } from "@/lib/eva/projects/api-types";
import {
  ACCOUNT_IMAGE_GEN_ARRANGE_HREF,
  ARRANGE_SHAPE_PRESETS,
} from "@/components/eva-dashboard/account/image-gen/constants";
import { accountImageGenArrangeResumeHref } from "@/lib/furniture-gen/save-studio-room-routes";
import { relativeTime } from "@/lib/site/account/mock-data";
import { cn } from "@/lib/utils";

function roomShapeLabel(shapeId: string): string {
  return ARRANGE_SHAPE_PRESETS.find((p) => p.id === shapeId)?.label ?? shapeId;
}

function envLabel(env: string): string {
  return env.charAt(0).toUpperCase() + env.slice(1);
}

type Props = {
  save: LatestStudioRoomSaveSummary;
  /** For `scrollIntoView` after redirect from Eva Studio */
  anchorId?: string;
  /** When set with `savedRoomId`, "Open studio" resumes that layout in Arrange. */
  projectId?: string;
  savedRoomId?: string;
  variant?: "default" | "compact";
  className?: string;
};

export function ProjectStudioRoomSummaryCard({
  save,
  anchorId,
  projectId,
  savedRoomId,
  variant = "default",
  className,
}: Props) {
  const isCompact = variant === "compact";

  return (
    <div
      id={anchorId}
      className={cn(
        "border-border scroll-mt-24 rounded-none border",
        isCompact ? "bg-muted/15 p-3" : "bg-card p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-muted-foreground font-semibold tracking-[0.18em] uppercase",
              isCompact ? "text-[9px]" : "text-[10px]",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <LayoutGrid className="h-3 w-3" />
              Latest room layout
            </span>
          </p>
          <p
            className={cn(
              "text-foreground mt-1 font-medium",
              isCompact ? "text-sm" : "text-[15px]",
            )}
          >
            {roomShapeLabel(save.roomShapeId)} · {save.widthM} × {save.depthM} m
            · {envLabel(save.environment)}
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Saved {relativeTime(save.createdAt)} · {save.placements.length}{" "}
            {save.placements.length === 1 ? "piece" : "pieces"} placed
          </p>
        </div>
        <Link
          href={
            projectId && (savedRoomId ?? save.id)
              ? accountImageGenArrangeResumeHref({
                  projectId,
                  savedRoomId: savedRoomId ?? save.id,
                })
              : ACCOUNT_IMAGE_GEN_ARRANGE_HREF
          }
          className="text-primary hover:text-primary/85 shrink-0 text-[11px] font-medium underline-offset-4 hover:underline"
        >
          Open studio
        </Link>
      </div>

      {save.placements.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {save.placements.map((p) => (
            <li
              key={`${save.id}-${p.pieceId}`}
              className="border-border bg-muted/30 flex max-w-[140px] min-w-0 items-center gap-2 rounded-none border px-2 py-1.5"
            >
              <div className="border-border relative h-10 w-10 shrink-0 overflow-hidden rounded-none border bg-[var(--muted)]">
                {p.previewImageUrl ? (
                  <Image
                    src={p.previewImageUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full w-full items-center justify-center text-[9px]">
                    3D
                  </div>
                )}
              </div>
              <span className="text-foreground line-clamp-2 min-w-0 text-[11px] leading-snug">
                {p.title}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
