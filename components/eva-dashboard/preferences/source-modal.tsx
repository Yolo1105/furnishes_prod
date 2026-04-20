"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/eva-dashboard/ui/dialog";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";

interface SourceModalProps {
  field: string;
  value: string;
  sourceMessageId?: string | null;
  open: boolean;
  onClose: () => void;
}

export function SourceModal({
  field,
  value,
  sourceMessageId,
  open,
  onClose,
}: SourceModalProps) {
  const [sourceContent, setSourceContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!sourceMessageId) {
      setSourceContent(null);
      return;
    }
    setLoading(true);
    apiGet<{ content: string }>(API_ROUTES.message(sourceMessageId))
      .then((data) => setSourceContent(data.content ?? null))
      .catch(() => setSourceContent(null))
      .finally(() => setLoading(false));
  }, [open, sourceMessageId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preference source</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{field}</strong>: {value}
          </p>
          {!sourceMessageId ? (
            <p className="text-muted-foreground">
              Manually set or source not tracked.
            </p>
          ) : loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : sourceContent ? (
            <div className="bg-muted/30 text-muted-foreground rounded border p-2">
              <p className="text-foreground mb-1 text-xs font-medium">
                Original message:
              </p>
              <p className="text-xs">{sourceContent}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Could not load source message.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
