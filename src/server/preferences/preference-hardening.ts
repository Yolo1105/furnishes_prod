import {
  classifyPreferenceMessageIntent,
  shouldSkipPreferenceExtraction,
} from "./preference-intent";
import { dropNegatedPreferenceCandidates } from "./preference-negation";
import {
  adjustConfidenceForUncertainty,
  detectPreferenceUncertainty,
} from "./preference-uncertainty";
import { validatePreferenceEvidence } from "./preference-evidence";
import { applyPreferenceFieldRouting } from "./preference-field-routing";
import { applyPreferenceContradictionConfidence } from "./preference-contradiction";
import { normalizePreferenceValue } from "./preference-normalization";
import type {
  ChatPreferenceCategory,
  ExtractedPreferenceCandidate,
} from "./preference-types";

/**
 * Shared post-extraction hardening for heuristic and OpenAI providers.
 * Never writes confirmed memory; never invents exclusion preferences.
 */
export function hardenExtractedPreferenceCandidates(input: {
  content: string;
  candidates: ExtractedPreferenceCandidate[];
  currentPreferences: Partial<Record<ChatPreferenceCategory, string | null>>;
}): ExtractedPreferenceCandidate[] {
  const message = input.content.trim();
  if (!message) return [];

  const intent = classifyPreferenceMessageIntent(message);
  if (shouldSkipPreferenceExtraction(intent)) {
    return [];
  }
  if (intent === "negation") {
    // Pure negation: no positive proposals and no hidden exclusion memory.
    return [];
  }

  let candidates = applyPreferenceFieldRouting(input.candidates);
  candidates = dropNegatedPreferenceCandidates(candidates, message);

  const uncertainty = detectPreferenceUncertainty(message);
  candidates = candidates
    .map((candidate) => validatePreferenceEvidence(message, candidate))
    .map((candidate) => ({
      ...candidate,
      confidence: adjustConfidenceForUncertainty(
        candidate.confidence,
        uncertainty.adjustment,
      ),
    }))
    .filter((candidate) => candidate.confidence > 0);

  candidates = applyPreferenceContradictionConfidence(
    candidates,
    message,
    input.currentPreferences,
  );

  return candidates.filter((candidate) => {
    const normalized = normalizePreferenceValue(
      candidate.category,
      candidate.value,
    );
    return Boolean(normalized);
  });
}
