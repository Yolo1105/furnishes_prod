import { normalizePreferenceValue } from "./preference-normalization";
import type {
  ChatPreferenceCategory,
  ExtractedPreferenceCandidate,
} from "./preference-types";

const CHANGE_INTENT =
  /\bactually\b|\binstead\b|\bchanged\s+my\s+mind\b|\bchange\s+it\s+to\b|\brather\s+(?:have|want|prefer)\b|\bno(?:t)?\s+(?:longer|more)\b|\b(?:lets?|let'?s)\s+go\s+with\b|\b(?:i|we)\s+(?:want|prefer)\s+(?:to\s+)?(?:change|switch)\b|\bprefer\s+\w+\s+now\b/i;

function detectPreferenceChangeIntent(message: string): boolean {
  return CHANGE_INTENT.test(message);
}

/**
 * Confirmed memory is never overwritten by extraction.
 * When values differ, keep a pending replacement proposal (previousValue set by caller).
 * Without change intent, slightly lower confidence so weak flips need clearer language.
 */
export function applyPreferenceContradictionConfidence(
  candidates: ExtractedPreferenceCandidate[],
  message: string,
  currentPreferences: Partial<Record<ChatPreferenceCategory, string | null>>,
): ExtractedPreferenceCandidate[] {
  const hasChangeIntent = detectPreferenceChangeIntent(message);
  return candidates.map((candidate) => {
    const current = currentPreferences[candidate.category];
    if (!current) return candidate;
    const currentNorm = normalizePreferenceValue(candidate.category, current);
    const nextNorm = normalizePreferenceValue(
      candidate.category,
      candidate.value,
    );
    if (!currentNorm || !nextNorm || currentNorm === nextNorm) {
      return candidate;
    }
    if (hasChangeIntent) return candidate;
    return {
      ...candidate,
      confidence: Math.max(0.1, candidate.confidence - 0.15),
    };
  });
}
