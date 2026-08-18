import { createOpenAIPreferenceExtractionProvider } from "@/server/preferences/preference-extraction-openai";
import type { ExtractedPreferenceCandidate } from "@/server/preferences/preference-types";
import { runAfterResponse } from "@/server/ops/after-response";
import { logChatOperationalEvent } from "./chat-ops";
import { isPreferenceExtractionShadowEnabled } from "./chat-rollout";

/**
 * Stage 2 shadow extraction: run OpenAI extract without persisting proposals.
 * Never logs message text or preference values.
 */
export function scheduleShadowPreferenceExtraction(input: {
  userId: string;
  conversationId: string;
  content: string;
  currentPreferences: Partial<Record<string, string | null>>;
  heuristicCandidateCount: number;
}): void {
  if (!isPreferenceExtractionShadowEnabled()) return;
  if (process.env.PREFERENCE_EXTRACTION_PROVIDER === "openai") return;

  runAfterResponse(async () => {
    try {
      const provider = createOpenAIPreferenceExtractionProvider();
      const prefs: Partial<Record<string, string>> = {};
      for (const [key, value] of Object.entries(input.currentPreferences)) {
        if (typeof value === "string") prefs[key] = value;
      }
      const shadow: ExtractedPreferenceCandidate[] = await provider.extract({
        content: input.content,
        currentPreferences: prefs,
      });
      logChatOperationalEvent({
        event: "extraction_shadow",
        userId: input.userId,
        conversationId: input.conversationId,
        heuristicCandidateCount: input.heuristicCandidateCount,
        shadowCandidateCount: shadow.length,
      });
    } catch (error) {
      logChatOperationalEvent({
        event: "extraction_shadow",
        userId: input.userId,
        conversationId: input.conversationId,
        heuristicCandidateCount: input.heuristicCandidateCount,
        shadowCandidateCount: -1,
        errorCategory:
          error instanceof Error ? error.name : "shadow_extract_failed",
      });
    }
  });
}
