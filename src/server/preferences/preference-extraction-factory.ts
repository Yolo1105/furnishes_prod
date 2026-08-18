import { createDisabledPreferenceExtractionProvider } from "./preference-extraction-disabled";
import { createHeuristicPreferenceExtractionProvider } from "./preference-extraction-heuristic";
import { createOpenAIPreferenceExtractionProvider } from "./preference-extraction-openai";
import type { PreferenceExtractionProvider } from "./preference-extraction-provider";

export {
  maxProposalsPerMessage,
  minExtractionConfidence,
} from "./preference-limits";

type PreferenceExtractionProviderName = "heuristic" | "openai" | "disabled";

function resolveName(
  raw = process.env.PREFERENCE_EXTRACTION_PROVIDER,
): PreferenceExtractionProviderName {
  const value = (raw ?? "heuristic").trim().toLowerCase();
  if (value === "openai" || value === "disabled" || value === "heuristic") {
    return value;
  }
  return "heuristic";
}

function assertEnv(): void {
  const name = resolveName();
  if (name !== "openai") return;
  const missing = ["OPENAI_API_KEY", "PREFERENCE_EXTRACTION_MODEL"].filter(
    (key) => !process.env[key]?.trim(),
  );
  if (missing.length > 0 && process.env.NODE_ENV === "production") {
    throw new Error(
      `OpenAI preference extraction is missing: ${missing.join(", ")}.`,
    );
  }
}

export function getPreferenceExtractionProvider(): {
  name: PreferenceExtractionProviderName;
  provider: PreferenceExtractionProvider;
} {
  assertEnv();
  const name = resolveName();
  if (name === "disabled") {
    return { name, provider: createDisabledPreferenceExtractionProvider() };
  }
  if (name === "openai") {
    try {
      return { name, provider: createOpenAIPreferenceExtractionProvider() };
    } catch {
      return {
        name: "heuristic",
        provider: createHeuristicPreferenceExtractionProvider(),
      };
    }
  }
  return {
    name: "heuristic",
    provider: createHeuristicPreferenceExtractionProvider(),
  };
}
