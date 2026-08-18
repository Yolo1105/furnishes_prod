/**
 * Shared extraction knobs. Kept out of the factory so OpenAI extraction
 * can import them without a factory ↔ openai cycle.
 */

export function minExtractionConfidence(): number {
  const raw = Number(
    process.env.PREFERENCE_EXTRACTION_MIN_CONFIDENCE ?? "0.45",
  );
  return Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : 0.45;
}

export function maxProposalsPerMessage(): number {
  const raw = Number(process.env.PREFERENCE_PROPOSAL_MAX_PER_MESSAGE ?? "4");
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 8) : 4;
}
