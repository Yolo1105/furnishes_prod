"use client";

import type { AssistantPersonaSummary } from "../persona-types";

export function PersonaOption({
  persona,
  selected,
  onSelect,
  disabled,
}: {
  persona: AssistantPersonaSummary;
  selected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={`wf-persona-opt${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(persona.id)}
    >
      <span className="wf-persona-opt__name">{persona.name}</span>
      <span className="wf-persona-opt__tag">{persona.tagline}</span>
      <span className="wf-persona-opt__desc">{persona.description}</span>
    </button>
  );
}
