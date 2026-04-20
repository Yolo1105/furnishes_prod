/**
 * Verifier: apply evidence-based confidence adjustment to extracted entities.
 * Ported from V1 verifier.py. Reduces confidence by 0.2 when no valid evidence.
 */
import { hasValidEvidence } from "./evidence-validator";

const NO_EVIDENCE_CONFIDENCE_PENALTY = 0.2;
/** Cap for entities with no valid evidence — don't trust LLM blindly. */
const MAX_CONFIDENCE_WITHOUT_EVIDENCE = 0.5;

export type EntityWithEvidence = {
  text: string;
  field: string;
  confidence: number;
  evidenceSpans?: Array<{ start: number; end: number; text: string }>;
};

/**
 * Apply verifier: for each entity, if it has evidenceSpans validate against message;
 * if no valid evidence, reduce confidence and cap at MAX_CONFIDENCE_WITHOUT_EVIDENCE.
 * Returns entities with confidence adjusted (clamped to [0.1, 1]).
 */
export function applyVerifierToEntities(
  entities: EntityWithEvidence[],
  message: string,
): EntityWithEvidence[] {
  return entities.map((entity) => {
    const spans = entity.evidenceSpans ?? [];
    const hasEvidence = hasValidEvidence(message, spans);
    const adjustment = hasEvidence ? 0 : -NO_EVIDENCE_CONFIDENCE_PENALTY;
    let confidence = Math.max(0.1, Math.min(1, entity.confidence + adjustment));
    if (!hasEvidence && confidence > MAX_CONFIDENCE_WITHOUT_EVIDENCE)
      confidence = MAX_CONFIDENCE_WITHOUT_EVIDENCE;
    return { ...entity, confidence };
  });
}
