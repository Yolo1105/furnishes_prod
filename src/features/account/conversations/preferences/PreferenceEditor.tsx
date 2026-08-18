"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useAccountOverlay } from "@/features/account/primitives/useAccountOverlay";
import {
  joinPreferenceValues,
  splitPreferenceValues,
} from "./preference-values";

export function PreferenceEditor({
  open,
  title = "Edit preference",
  category,
  initialValue,
  saving,
  onClose,
  onSave,
  onRemove,
  onViewSource,
  inertTargets,
  restoreFocusRef,
}: {
  open: boolean;
  title?: string;
  category: string;
  initialValue: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  onRemove?: () => void;
  onViewSource?: () => void;
  inertTargets?: Array<RefObject<HTMLElement | null> | HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<string[]>(() =>
    splitPreferenceValues(initialValue),
  );
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      setTags(splitPreferenceValues(initialValue));
      setDraft("");
    }
  }, [open, initialValue]);

  useAccountOverlay({
    open,
    onClose,
    panelRef,
    initialFocusRef: inputRef,
    ...(restoreFocusRef ? { restoreFocusRef } : {}),
    ...(inertTargets ? { inertTargets } : {}),
  });

  function commitDraft() {
    const next = draft.trim();
    if (!next) return;
    setTags((prev) => {
      const joined = joinPreferenceValues([...prev, next]);
      return splitPreferenceValues(joined);
    });
    setDraft("");
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && !draft && tags.length > 0) {
      event.preventDefault();
      setTags((prev) => prev.slice(0, -1));
    }
  }

  if (!open) return null;

  return (
    <div className="wf-prefedit-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className="wf-prefedit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <p className="wf-prefedit__cat">{category}</p>
        <p className="wf-prefedit__hint">
          Add one or more values. Press Enter after each.
        </p>
        <div className="wf-prefedit__tags">
          {tags.map((tag) => (
            <span key={tag.toLowerCase()} className="wf-prefedit__tag">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                disabled={saving}
                onClick={() =>
                  setTags((prev) =>
                    prev.filter(
                      (item) => item.toLowerCase() !== tag.toLowerCase(),
                    ),
                  )
                }
              >
                ✕
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onInputKeyDown}
            onBlur={commitDraft}
            maxLength={120}
            placeholder={tags.length ? "Add another…" : "Type a value…"}
            aria-label="Preference value"
          />
        </div>
        <div className="wf-prefedit__acts">
          <button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {onRemove ? (
            <button
              type="button"
              className="wf-prefedit__remove"
              disabled={saving}
              onClick={onRemove}
            >
              Clear all
            </button>
          ) : null}
          {onViewSource ? (
            <button type="button" disabled={saving} onClick={onViewSource}>
              View source
            </button>
          ) : null}
          <button
            type="button"
            className="wf-prefedit__save"
            disabled={saving || (tags.length === 0 && !draft.trim())}
            onMouseDown={(event) => {
              // Keep focus so blur→commitDraft re-render cannot swallow the click.
              event.preventDefault();
            }}
            onClick={() => {
              const pending = draft.trim();
              const next = pending
                ? splitPreferenceValues(
                    joinPreferenceValues([...tags, pending]),
                  )
                : tags;
              onSave(joinPreferenceValues(next));
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
