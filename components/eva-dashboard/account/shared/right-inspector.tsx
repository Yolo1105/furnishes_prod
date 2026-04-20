"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Eyebrow } from "./eyebrow";

/**
 * Right-docked inspector overlay (edit-in-place).
 *
 * Matches the Eva chatbot's RightSidebar pattern. Used for inline editing
 * of a selected record (project detail, preference, profile field, etc.)
 * instead of a modal, because the user's context (the list they came from)
 * stays visible.
 *
 * - Esc closes
 * - Backdrop click closes
 * - Body scroll locked while open
 * - Portal-rendered so stacking context is predictable
 */
export function RightInspector({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  width = "420px",
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const [mounted, setMounted] = useState(false);
  /** Enter: fade (+ slight rise) — avoids horizontal slide (often read as “right → left” on a right-docked panel). */
  const [entered, setEntered] = useState(false);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    if (reduceMotionRef.current) {
      setEntered(true);
      return;
    }
    setEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;
  if (typeof document === "undefined" || !document.body) return null;

  const motionSafe = !reduceMotionRef.current;
  const backdropOpacity = motionSafe && !entered ? 0 : 1;
  const panelOpacity = motionSafe && !entered ? 0 : 1;
  const panelTranslateY = motionSafe && !entered ? 10 : 0;

  return createPortal(
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="bg-foreground/25 absolute inset-0 cursor-pointer backdrop-blur-[2px] transition-opacity duration-200 ease-out"
        style={{ opacity: backdropOpacity }}
      />

      {/* Panel */}
      <aside
        className="bg-card border-border absolute top-0 right-0 flex h-full flex-col border-l shadow-[-8px_0_30px_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-300 ease-out will-change-[opacity,transform]"
        style={{
          width: `min(${width}, 100%)`,
          opacity: panelOpacity,
          transform: `translateY(${panelTranslateY}px)`,
        }}
      >
        <header className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-1">
                <Eyebrow>{eyebrow}</Eyebrow>
              </div>
            )}
            <h2 className="text-foreground truncate text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hover:bg-muted text-foreground inline-flex h-8 w-8 items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <footer className="border-border bg-muted/30 border-t px-5 py-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
