import type { AssistantPersonaDefinition } from "./persona-types";

/**
 * Persona overlay appended to the chat system prompt.
 * Does not include Product recommendations, playbooks, or workflow stage names.
 */
export function buildAssistantPersonaPromptOverlay(
  persona: AssistantPersonaDefinition,
): string {
  const rules = persona.priorityRules
    .map((rule, index) => `${index + 1}. ${rule}`)
    .join("\n");
  const bestFor = persona.idealUseCases.map((item) => `• ${item}`).join("\n");

  return `[ASSISTANT: ${persona.name}]
${persona.description}

Primary objective: ${persona.primaryGoal}

Reply tone & structure: ${persona.replyStyle}

Conversational rhythm: Sound like a live design partner, not a report generator. Avoid stock openers ("Absolutely", "Great choice", "That makes sense", "Based on your preferences") unless they fit naturally. Vary how you begin. For direct questions, answer first in a few tight sentences; add structure only when it helps. Prefer one focused follow-up question over a list of questions. When project memory is present, weave it in with short natural bridges—never quote JSON keys, field labels, or say "according to project memory."

Priority rules (apply in order):
${rules}

Follow-up and chip-style suggestions: ${persona.suggestionStyle}

Best for:
${bestFor}`;
}

export function mergeAssistantIntoSystemPrompt(
  basePrompt: string,
  persona: AssistantPersonaDefinition,
): string {
  const overlay = buildAssistantPersonaPromptOverlay(persona);
  return `${basePrompt.trim()}\n\n${overlay}`;
}
