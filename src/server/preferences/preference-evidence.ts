import type { ExtractedPreferenceCandidate } from "./preference-types";

function normalizeWs(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Evidence offsets must fall inside the source user message and reproduce
 * the stored quotation. Invalid evidence is penalized, not invented.
 */
export function validatePreferenceEvidence(
  message: string,
  candidate: ExtractedPreferenceCandidate,
): ExtractedPreferenceCandidate {
  const { evidenceText, evidenceStart, evidenceEnd, confidence } = candidate;
  if (
    evidenceText == null ||
    evidenceStart == null ||
    evidenceEnd == null ||
    !Number.isFinite(evidenceStart) ||
    !Number.isFinite(evidenceEnd)
  ) {
    return {
      category: candidate.category,
      value: candidate.value,
      confidence: Math.min(confidence, 0.5),
    };
  }

  if (
    evidenceStart < 0 ||
    evidenceEnd > message.length ||
    evidenceStart >= evidenceEnd
  ) {
    return {
      category: candidate.category,
      value: candidate.value,
      confidence: Math.max(0.1, Math.min(confidence - 0.2, 0.5)),
    };
  }

  const slice = message.slice(evidenceStart, evidenceEnd);
  if (normalizeWs(slice) !== normalizeWs(evidenceText)) {
    return {
      category: candidate.category,
      value: candidate.value,
      confidence: Math.max(0.1, Math.min(confidence - 0.2, 0.5)),
    };
  }

  return candidate;
}
