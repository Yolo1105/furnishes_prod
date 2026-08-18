"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Sticky stage-side inspector — matches prototype `.wf-insp` split panel.
 * Parent should wrap with AccountWireFrame `inspector` so `.wf-split` applies.
 */
export function AccountInspector({
  open,
  eye,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  eye?: string;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    panelRef.current.scrollTop = 0;
  }, [open, title]);

  if (!open) return null;

  return (
    <aside className="wf-insp open" ref={panelRef} aria-label="Details">
      <button
        type="button"
        className="wf-insp__x"
        title="Close"
        onClick={onClose}
      >
        ✕
      </button>
      <div className="wf-insp__body">
        {eye ? <p className="wf-eye">{eye}</p> : null}
        {title ? <h2 className="wf-insp__t">{title}</h2> : null}
        {children}
        {actions ? <div className="wf-insp__act">{actions}</div> : null}
      </div>
    </aside>
  );
}
