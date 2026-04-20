"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/eva-dashboard/ui/button";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_SECONDS = 60;

export interface ProposalItem {
  field: string;
  value: string;
  confidence: number;
  changeId: string;
}

interface ConfirmationBannerProps {
  proposals: ProposalItem[];
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
  onAutoDismiss?: () => void;
  className?: string;
}

export function ConfirmationBanner({
  proposals,
  onAccept,
  onReject,
  onAutoDismiss,
  className,
}: ConfirmationBannerProps) {
  const [countdown, setCountdown] = useState<number | null>(
    onAutoDismiss ? AUTO_DISMISS_SECONDS : null,
  );

  useEffect(() => {
    if (proposals.length === 0 || !onAutoDismiss || countdown === null) return;
    if (countdown <= 0) {
      onAutoDismiss();
      setCountdown(null);
      return;
    }
    const t = setInterval(() => {
      setCountdown((c) => (c === null ? null : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [proposals.length, onAutoDismiss, countdown]);

  useEffect(() => {
    if (proposals.length > 0 && onAutoDismiss)
      setCountdown(AUTO_DISMISS_SECONDS);
  }, [proposals.length, onAutoDismiss]);

  if (proposals.length === 0) return null;
  return (
    <div
      className={cn(
        "border-border/40 bg-muted/15 rounded-md border p-2 text-xs shadow-none",
        className,
      )}
    >
      <p className="text-muted-foreground mb-1.5 leading-snug font-medium">
        Save these to your brief?
        {countdown !== null && countdown > 0 && (
          <span className="text-muted-foreground/80 ml-2 font-normal">
            Dismisses in {countdown}s
          </span>
        )}
      </p>
      <ul className="space-y-1.5">
        {proposals.map((p) => (
          <li
            key={p.changeId}
            className="flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <span className="text-foreground/90">
              <span className="font-medium">{p.field}</span>: {p.value}
              <span className="text-muted-foreground ml-1">
                ({Math.round(p.confidence * 100)}%)
              </span>
            </span>
            <span className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="border-success-border bg-success text-success-foreground h-7 hover:opacity-90"
                onClick={() => onAccept(p.changeId)}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-muted-foreground h-7"
                onClick={() => onReject(p.changeId)}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
