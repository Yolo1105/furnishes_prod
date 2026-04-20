"use client";

import { Button } from "@/components/eva-dashboard/ui/button";

interface ReviewPromptProps {
  preferences: Record<string, string>;
  onDismiss: () => void;
  onReview: () => void;
}

export function ReviewPrompt({
  preferences,
  onDismiss,
  onReview,
}: ReviewPromptProps) {
  const count = Object.keys(preferences).filter((k) => preferences[k]).length;
  if (count === 0) return null;
  return (
    <div className="border-border/40 bg-muted/15 rounded-md border p-2 text-xs shadow-none">
      <p className="text-muted-foreground mb-1.5 leading-snug">
        Want a quick look at your saved preferences in the side panel?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onReview}>
          Open preferences
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
