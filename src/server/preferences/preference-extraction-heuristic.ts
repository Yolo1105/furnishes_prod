import { normalizePreferenceValue } from "./preference-normalization";
import type { PreferenceExtractionProvider } from "./preference-extraction-provider";
import type {
  ChatPreferenceCategory,
  ExtractedPreferenceCandidate,
} from "./preference-types";

const ROOM_RE =
  /\b((?:living\s*room)|(?:home\s*office)|(?:dining(?:\s*room)?)|bedroom|kitchen|bathroom|studio|(?:open[-\s]?plan))\b/i;

const BUDGET_RE =
  /\b(?:under|below|max(?:imum)?|budget(?:\s*(?:of|is|around|about))?|around|about|up\s*to)\s*(?:\$|USD\s*|SGD\s*)?([\d,.]+)\s*(k|thousand)?\b/i;

const STYLE_RE =
  /\b(japandi|scandi(?:navian)?|minimal(?:ist)?|maximal(?:ist)?|industrial|mid[-\s]?century|boho|bohemian|coastal|traditional|modern|rustic|contemporary)\b/i;

const COLOR_RE =
  /\b(navy(?:\s*blue)?|sage(?:\s*green)?|cream(?:\s*white)?|charcoal(?:\s*gr[ae]y)?|blush(?:\s*pink)?|mustard(?:\s*yellow)?|warm\s*beige|warm\s*tones|cool\s*tones|neutrals?|earth\s*tones|blue|green|beige|white|black|terracotta|oak\s*tones)\b/i;

const FURNITURE_RE =
  /\b(sofa|sectional|bed(?:frame)?|dining\s*table|coffee\s*table|side\s*table|desk|chair|lighting|lamp|rug|bookshelf|wardrobe|nightstand)\b/gi;

function pushCandidate(
  out: ExtractedPreferenceCandidate[],
  category: ChatPreferenceCategory,
  raw: string,
  confidence: number,
  content: string,
  matchIndex: number,
  matchLength: number,
) {
  const value = normalizePreferenceValue(category, raw);
  if (!value) return;
  out.push({
    category,
    value,
    confidence,
    evidenceText: content.slice(matchIndex, matchIndex + matchLength),
    evidenceStart: matchIndex,
    evidenceEnd: matchIndex + matchLength,
  });
}

/**
 * Deterministic heuristic extractor for the five visible chat categories.
 * Sufficient for unit/E2E tests without external credentials.
 */
export function createHeuristicPreferenceExtractionProvider(): PreferenceExtractionProvider {
  return {
    async extract({ content, currentPreferences }) {
      const text = content.trim();
      if (!text) return [];

      const candidates: ExtractedPreferenceCandidate[] = [];

      const room = ROOM_RE.exec(text);
      if (room?.[1]) {
        pushCandidate(
          candidates,
          "room",
          room[1],
          0.86,
          text,
          room.index,
          room[0].length,
        );
      }

      const budget = BUDGET_RE.exec(text);
      if (budget?.[1]) {
        const amount = budget[1].replace(/,/g, "");
        const multiplier = budget[2] ? 1000 : 1;
        const numeric = Number.parseFloat(amount) * multiplier;
        const label = Number.isFinite(numeric)
          ? `S$${Math.round(numeric)}`
          : budget[0];
        pushCandidate(
          candidates,
          "budget",
          label,
          0.82,
          text,
          budget.index,
          budget[0].length,
        );
      }

      const style = STYLE_RE.exec(text);
      if (style?.[1]) {
        pushCandidate(
          candidates,
          "style",
          style[1],
          0.84,
          text,
          style.index,
          style[0].length,
        );
      }

      const color = COLOR_RE.exec(text);
      if (color?.[1]) {
        pushCandidate(
          candidates,
          "color",
          color[1],
          0.8,
          text,
          color.index,
          color[0].length,
        );
      }

      const furnitureMatches = [...text.matchAll(FURNITURE_RE)];
      if (furnitureMatches.length > 0) {
        const unique = [
          ...new Set(
            furnitureMatches.map((match) =>
              match[0].toLowerCase().replace(/\s+/g, " "),
            ),
          ),
        ];
        const first = furnitureMatches[0]!;
        pushCandidate(
          candidates,
          "furniture",
          unique.join(", "),
          0.78,
          text,
          first.index ?? 0,
          first[0].length,
        );
      }

      return candidates.filter((candidate) => {
        const current = currentPreferences[candidate.category];
        if (!current) return true;
        return (
          normalizePreferenceValue(candidate.category, current) !==
          candidate.value
        );
      });
    },
  };
}
