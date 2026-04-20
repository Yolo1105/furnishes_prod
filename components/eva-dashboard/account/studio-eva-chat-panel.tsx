"use client";

import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import { StudioRailChatInner } from "@/components/eva-dashboard/chat/studio-rail-chat";

/**
 * Compact Eva chat for Studio pages that need a persistent right rail (e.g. 2D image gen).
 * Full assistant remains at `/chatbot`.
 */
export function StudioEvaChatPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-border flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <div className="font-ui text-foreground flex min-w-0 items-center gap-2 text-[12.5px]">
          <MessageSquare className="text-primary h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Eva</span>
        </div>
        <Link
          href="/chatbot"
          className="text-primary hover:text-primary/90 font-ui inline-flex shrink-0 items-center gap-1 text-[11px] font-medium"
        >
          Open full
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <StudioRailChatInner />
      </div>
    </div>
  );
}
