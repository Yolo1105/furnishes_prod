"use client";

import { useId, useRef } from "react";
import type { RefObject } from "react";
import { useAccountOverlay } from "@/features/account/primitives/useAccountOverlay";
import { PersonaOption } from "./PersonaOption";
import type { AssistantPersonaSummary } from "../persona-types";

export function PersonaPicker({
  open,
  personas,
  activeId,
  saving,
  onClose,
  onSelect,
  inertTargets,
  restoreFocusRef,
}: {
  open: boolean;
  personas: AssistantPersonaSummary[];
  activeId: string;
  saving: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  inertTargets?: Array<RefObject<HTMLElement | null> | HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useAccountOverlay({
    open,
    onClose,
    panelRef,
    ...(restoreFocusRef ? { restoreFocusRef } : {}),
    ...(inertTargets ? { inertTargets } : {}),
  });

  if (!open) return null;

  return (
    <div className="wf-persona-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="wf-persona-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wf-persona-sheet__head">
          <h2 id={titleId}>Choose Eva</h2>
          <button
            type="button"
            className="wf-persona-sheet__x"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div
          className="wf-persona-sheet__list"
          role="radiogroup"
          aria-label="Eva personas"
        >
          {personas.map((persona) => (
            <PersonaOption
              key={persona.id}
              persona={persona}
              selected={persona.id === activeId}
              disabled={saving}
              onSelect={onSelect}
            />
          ))}
        </div>
        {saving ? <p className="wf-persona-sheet__busy">Saving…</p> : null}
      </div>
    </div>
  );
}
