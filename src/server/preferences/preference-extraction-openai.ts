import { envMs } from "@/server/env";
import { extractedCandidatesSchema } from "./preference-schema";
import type { PreferenceExtractionProvider } from "./preference-extraction-provider";
import type { ExtractedPreferenceCandidate } from "./preference-types";
import { maxProposalsPerMessage } from "./preference-limits";
import { recordCost } from "@/server/ops/cost-guard";

function timeoutMs(): number {
  return envMs("PREFERENCE_EXTRACTION_TIMEOUT_MS", 20_000);
}

/**
 * System prompt for OpenAI preference extraction.
 * Guidance re-derived from legacy `config/domain.json` extraction patterns,
 * mapped only to the five categories: room | budget | style | color | furniture.
 */
export function buildPreferenceExtractionSystemPrompt(
  maxCandidates: number = maxProposalsPerMessage(),
): string {
  return `Extract only preferences explicitly stated by the user.
Do not infer from assistant text.
Do not treat a topic request as a personal preference.
Do not store generic phrases such as "color palette".
Return no more than ${maxCandidates} items.
Use only the five allowed categories: room, budget, style, color, furniture.
Respond with JSON: {"candidates":[{"category":"...","value":"...","confidence":0.0,"evidenceText":"..."}]}

--- Extraction patterns (normalize values when storing) ---

Room: Include variations such as "master bedroom", "guest room", "home office", "dining room", "living room", "bedroom", "kitchen", "bathroom", "office", "nursery", "den". Normalize to a canonical room when clear (e.g. "master" → bedroom, "home office" → office).

Budget: Formats like "$5k", "5000", "between $3000 and $7000", "under 10k", "tight budget", "no set budget", "splurge on the sofa" — normalize to a clear range or statement when possible. A single number is a total room budget unless they say "per piece".

Style aliases: "MCM" or "mid century" → mid-century modern; "scandi" → scandinavian; "boho" → bohemian; "minimal" → minimal; also contemporary, industrial, farmhouse, coastal when stated.
Style conflict: when the user states two competing directions in one message (e.g. minimalist + maximalist shelves), extract BOTH as style candidates with the conflict named in evidenceText (e.g. "tension: minimal dominant vs maximalist accent shelves"). Do not silently drop one side. Prefer a value that records the proposed dominant/accent resolution when the user already chose one.

Color: Extract palette, walls, or accents (e.g. "navy and gold", "earth tones", "neutrals", "warm tones", "cool grays", "white walls", accent wall + color). Prefer concrete color words over vague "nice colors".

Furniture: Specific pieces and constraints (sectional, L-shaped sofa, king/queen bed, dining table for N / seats N, desk, nightstands, coffee table, ottoman, armchair). Note quantity when given (e.g. "two nightstands").`;
}

/**
 * OpenAI preference extraction via fetch (no SDK import).
 * Requires OPENAI_API_KEY and PREFERENCE_EXTRACTION_MODEL.
 */
export function createOpenAIPreferenceExtractionProvider(): PreferenceExtractionProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.PREFERENCE_EXTRACTION_MODEL?.trim();

  if (!apiKey || !model) {
    throw new Error(
      "OpenAI preference extraction requires OPENAI_API_KEY and PREFERENCE_EXTRACTION_MODEL.",
    );
  }

  return {
    async extract({ content, currentPreferences, costContext }) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs());
      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model,
              temperature: 0,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: buildPreferenceExtractionSystemPrompt(
                    maxProposalsPerMessage(),
                  ),
                },
                {
                  role: "user",
                  content: JSON.stringify({
                    content,
                    currentPreferences,
                  }),
                },
              ],
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`OpenAI extraction HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: unknown;
        };
        if (costContext?.userId && payload.usage) {
          await recordCost({
            userId: costContext.userId,
            conversationId: costContext.conversationId ?? null,
            model,
            kind: "extraction",
            usage: payload.usage,
          }).catch(() => {
            /* cost ledger must not fail extraction */
          });
        }
        const raw = payload.choices?.[0]?.message?.content?.trim() ?? "{}";
        const parsed = JSON.parse(raw) as { candidates?: unknown };
        const candidates = extractedCandidatesSchema.parse(
          parsed.candidates ?? [],
        );
        return candidates.slice(
          0,
          maxProposalsPerMessage(),
        ) as ExtractedPreferenceCandidate[];
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
