"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/**
 * Destructive / high-stakes confirmation modal.
 *
 * Used for: delete, forget-all, sign-out-everywhere, archive, request-deletion.
 * Reserved for truly irreversible or significant actions — routine edits use
 * RightInspector instead.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof window === "undefined" || !open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100]">
      <div
        onClick={onClose}
        className="bg-foreground/30 absolute inset-0 cursor-pointer"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-card border-border w-full max-w-md border p-6 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
          <div className="flex items-start gap-3">
            <div
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                destructive
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-foreground"
              }`}
            >
              {icon ?? <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-foreground text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
                {title}
              </h3>
              <div className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {body}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted inline-flex h-9 items-center border px-4 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`inline-flex h-9 items-center px-4 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors ${
                destructive
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
