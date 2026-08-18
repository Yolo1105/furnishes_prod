import type { ExtractedPreferenceCandidate } from "./preference-types";

type PreferenceExtractionCostContext = {
  userId: string;
  conversationId?: string | null;
};

export interface PreferenceExtractionProvider {
  extract(input: {
    content: string;
    currentPreferences: Partial<Record<string, string>>;
    costContext?: PreferenceExtractionCostContext;
  }): Promise<ExtractedPreferenceCandidate[]>;
}
