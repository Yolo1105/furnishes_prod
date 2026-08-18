import type { PreferenceExtractionProvider } from "./preference-extraction-provider";

export function createDisabledPreferenceExtractionProvider(): PreferenceExtractionProvider {
  return {
    async extract() {
      return [];
    },
  };
}
