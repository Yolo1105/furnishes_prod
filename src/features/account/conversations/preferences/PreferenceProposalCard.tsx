"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ChatPreferenceCategory,
  PreferenceProposalDto,
} from "../preference-types";

const PREF_LABELS: Record<ChatPreferenceCategory, string> = {
  room: "room type",
  budget: "budget range",
  style: "design style",
  color: "color preference",
  furniture: "furniture need",
};

function capT(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PreferenceProposalCard({
  proposal,
  busy,
  onAccept,
  onEdit,
  onDismiss,
  onViewSource,
  autoDismiss = true,
}: {
  proposal: PreferenceProposalDto;
  busy?: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  onViewSource: () => void;
  /** Match prototype 60s countdown; disable in review dialog. */
  autoDismiss?: boolean;
}) {
  const [secs, setSecs] = useState(60);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!autoDismiss) return;
    setSecs(60);
    const timer = window.setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onDismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [autoDismiss, proposal.id]);

  const label = PREF_LABELS[proposal.category] ?? proposal.category;

  return (
    <div
      className="wf-propbanner wf-in2"
      data-proposal-id={proposal.id}
      data-prop
    >
      <span>
        Eva suggests:{" "}
        <b>
          {label}, {capT(proposal.proposedValue)}
        </b>
      </span>
      <span className="conf">{proposal.confidenceLabel} confidence</span>
      {proposal.source === "quiz" ? (
        <span className="wf-propbanner__quiz" data-quiz-source>
          From your quiz
        </span>
      ) : null}
      <button
        type="button"
        className="wf-exbtn"
        disabled={busy}
        onClick={onAccept}
      >
        ✓ Accept
      </button>
      <button
        type="button"
        className="wf-exbtn wf-exbtn--ghost"
        disabled={busy}
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        type="button"
        className="wf-exbtn wf-exbtn--ghost"
        disabled={busy}
        onClick={onDismiss}
      >
        Dismiss
      </button>
      {proposal.source === "quiz" ? null : (
        <button
          type="button"
          className="wf-exbtn wf-exbtn--ghost"
          disabled={busy}
          onClick={onViewSource}
        >
          View source
        </button>
      )}
      {autoDismiss ? (
        <span className="cd" data-prop-cd>
          auto-dismiss {secs}s
        </span>
      ) : null}
    </div>
  );
}
