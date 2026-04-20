"use client";

import Link from "next/link";
import { FileImage } from "lucide-react";
import type { ConversationArtifact } from "@/lib/eva-dashboard/conversation-output-types";
import { accountPaths } from "@/lib/eva-dashboard/account-paths";
import {
  PROJECT_SUMMARY_COPY,
  PROJECT_SUMMARY_UI,
} from "@/lib/eva/projects/summary-constants";
import { cn } from "@/lib/utils";

type Props = {
  artifact: ConversationArtifact;
  className?: string;
  /** Show a small “Starred” badge when this artifact is in the highlighted set. */
  starred?: boolean;
};

export function ProjectArtifactTile({
  artifact: a,
  className,
  starred,
}: Props) {
  return (
    <div
      className={cn(
        "border-border bg-muted/20 flex gap-3 rounded-md border p-2",
        className,
      )}
    >
      <div className="bg-muted relative h-14 w-14 shrink-0 overflow-hidden rounded">
        {a.fileType === "image" && a.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote / signed URLs
          <img
            src={a.previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full w-full items-center justify-center">
            <FileImage className="h-6 w-6 opacity-60" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-foreground line-clamp-2 text-xs leading-snug font-medium">
            {a.title}
          </p>
          {starred ? (
            <span className="text-primary text-[9px] font-semibold uppercase">
              Starred
            </span>
          ) : null}
        </div>
        <p className="text-muted-foreground mt-0.5 text-[10px]">
          {a.description.slice(
            0,
            PROJECT_SUMMARY_UI.artifactDescriptionPreviewChars,
          )}
          {a.description.length >
          PROJECT_SUMMARY_UI.artifactDescriptionPreviewChars
            ? "…"
            : ""}
        </p>
        <Link
          href={accountPaths.conversation(a.conversationId)}
          className="text-primary mt-1 inline-block text-[11px] underline"
        >
          {PROJECT_SUMMARY_COPY.openChat}
        </Link>
      </div>
    </div>
  );
}
