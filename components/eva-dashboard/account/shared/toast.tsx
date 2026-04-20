"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; message: string; kind: ToastKind };

type ToastContextValue = {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, kind }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => push("success", msg),
    error: (msg: string) => push("error", msg),
    info: (msg: string) => push("info", msg),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Portal-ish — fixed stack at bottom-right */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} t={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  // Auto-dismiss after 4s
  useEffect(() => {
    const id = setTimeout(onDismiss, 4000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const Icon =
    t.kind === "success" ? CheckCircle2 : t.kind === "error" ? XCircle : Info;

  const stripColor =
    t.kind === "success"
      ? "var(--primary)"
      : t.kind === "error"
        ? "var(--destructive)"
        : "var(--muted-foreground)";

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 border px-4 py-3"
      style={{
        background: "var(--card)",
        borderColor: "var(--border-strong)",
        borderLeftWidth: "4px",
        borderLeftColor: stripColor,
        color: "var(--foreground)",
        boxShadow: "0 8px 24px rgba(43,31,24,0.12)",
      }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: stripColor }} />
      <div className="font-ui flex-1 text-sm leading-snug">{t.message}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="inline-flex h-5 w-5 items-center justify-center transition-opacity hover:opacity-60"
        style={{ color: "var(--muted-foreground)" }}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
