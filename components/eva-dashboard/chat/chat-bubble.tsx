"use client";

import { CHAT_ASSISTANT_BUBBLE_MAX_CLASS } from "@/components/eva-dashboard/chat/chat-layout-classes";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}

export function ChatBubble({
  role,
  children,
  size = "md",
  className,
}: ChatBubbleProps) {
  const isUser = role === "user";
  return (
    <div
      lang="en"
      className={cn(
        "border-border bg-muted/30 text-foreground/80 rounded-lg border [overflow-wrap:anywhere] break-words hyphens-auto",
        size === "md" ? "px-3 py-2 text-sm" : "px-2.5 py-1.5 text-xs",
        isUser
          ? "w-fit max-w-[100%] min-w-0"
          : cn(CHAT_ASSISTANT_BUBBLE_MAX_CLASS, "min-w-0"),
        className,
      )}
    >
      {children}
    </div>
  );
}
