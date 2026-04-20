"use client";

import { Avatar, AvatarFallback } from "@/components/eva-dashboard/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatAvatarProps {
  role: "user" | "assistant";
  initial?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { container: "h-6 w-6", text: "text-[10px]" },
  md: { container: "h-7 w-7", text: "text-[10px]" },
  lg: { container: "h-14 w-14", text: "text-lg" },
};

export function ChatAvatar({
  role,
  initial = "E",
  size = "md",
}: ChatAvatarProps) {
  const isUser = role === "user";
  const s = SIZES[size];
  return (
    <Avatar
      className={cn(
        s.container,
        "shrink-0",
        isUser ? "bg-accent" : "bg-primary",
      )}
    >
      <AvatarFallback
        className={cn(
          s.text,
          "font-semibold",
          isUser
            ? "bg-accent text-accent-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? "Y" : initial}
      </AvatarFallback>
    </Avatar>
  );
}
