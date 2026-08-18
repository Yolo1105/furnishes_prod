"use client";

import { useId, useRef } from "react";
import type { RefObject } from "react";
import { useAccountOverlay } from "@/features/account/primitives/useAccountOverlay";
import type { PreferenceSourceDto } from "../preference-types";

function roleLabel(role: string | null): string {
  if (!role) return "From your quiz";
  const normalized = role.trim().toLowerCase();
  if (normalized === "user") return "From your message";
  if (normalized === "assistant") return "From Eva’s response";
  if (normalized === "system") return "From your quiz";
  return `From ${role}`;
}

export function PreferenceSourceInspector({
  open,
  source,
  canGoToMessage,
  onClose,
  onGoToMessage,
  inertTargets,
  restoreFocusRef,
}: {
  open: boolean;
  source: PreferenceSourceDto | null;
  canGoToMessage: boolean;
  onClose: () => void;
  onGoToMessage: () => void;
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

  if (!open || !source) return null;

  return (
    <div className="wf-src-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="wf-src"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wf-src__head">
          <h2 id={titleId}>Preference source</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <dl className="wf-src__dl">
          <div>
            <dt>Category</dt>
            <dd>{source.category}</dd>
          </div>
          <div>
            <dt>Value</dt>
            <dd>{source.acceptedValue ?? source.proposedValue}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd>{Math.round(source.confidence * 100)}%</dd>
          </div>
          <div>
            <dt>Origin</dt>
            <dd>{roleLabel(source.sourceMessageRole)}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {source.sourceMessageTimestamp
                ? new Date(source.sourceMessageTimestamp).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
        <blockquote className="wf-src__quote">
          {source.sourceMessageContent}
        </blockquote>
        {canGoToMessage ? (
          <button type="button" className="wf-src__go" onClick={onGoToMessage}>
            Go to message
          </button>
        ) : null}
      </div>
    </div>
  );
}
