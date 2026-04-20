import type {
  RagDocumentHit,
  RetrievalQualityLevel,
} from "@/lib/eva/rag/retrieval-types";

/** Shared tag for design-doc retrieval blocks (one place for grep / tests). */
export const RETRIEVAL_PROMPT_SECTION_TAG = "[DESIGN KNOWLEDGE]" as const;

function formatProvenanceLine(hit: RagDocumentHit, index: number): string {
  const provenance = [
    `id=${hit.documentId}`,
    `source=${hit.source}`,
    `chunk=${hit.chunkIndex}`,
    `cos=${hit.similarityScore.toFixed(3)}`,
    `lex=${hit.lexicalScore.toFixed(3)}`,
    `combined=${hit.combinedScore.toFixed(3)}`,
    hit.category ? `category=${hit.category}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `[#${index + 1} ${provenance}]\n${hit.content}`;
}

function cautionForQuality(quality: RetrievalQualityLevel): string {
  if (quality === "weak") {
    return "\nRetrieval quality: WEAK — treat snippets as suggestive only; avoid verbatim internal claims.";
  }
  if (quality === "strong") {
    return "\nRetrieval quality: STRONG — still verify fit for the user's exact situation.";
  }
  return "";
}

/**
 * Build the retrieval section of the system prompt with explicit provenance and quality cues.
 */
export function buildRetrievalPromptSection(payload: {
  quality: RetrievalQualityLevel;
  hits: RagDocumentHit[];
  /** Best cosine when nothing met inclusion thresholds (diagnostics / weak signal). */
  topCosineBelowThreshold: number;
}): string {
  const { quality, hits, topCosineBelowThreshold } = payload;

  if (quality === "unavailable") {
    return `\n\n${RETRIEVAL_PROMPT_SECTION_TAG} Retrieval was unavailable (embedding or datastore error). Answer from general knowledge only; do not claim specific internal design-library citations.`;
  }

  if (hits.length === 0) {
    if (quality === "weak" && topCosineBelowThreshold > 0) {
      return `\n\n${RETRIEVAL_PROMPT_SECTION_TAG} Retrieval found only low-confidence matches (best cosine ${topCosineBelowThreshold.toFixed(3)} below the inclusion bar). Avoid citing specific internal documents; prefer general guidance and state uncertainty.`;
    }
    if (quality === "weak") {
      return `\n\n${RETRIEVAL_PROMPT_SECTION_TAG} Retrieval did not return usable chunks for this query. Answer cautiously without treating internal documents as grounded.`;
    }
    return "";
  }

  const lines = hits.map((hit, index) => formatProvenanceLine(hit, index));
  const caution = cautionForQuality(quality);

  return `\n\n${RETRIEVAL_PROMPT_SECTION_TAG} Retrieved snippets (provenance inline).${caution}\n${lines.join("\n\n---\n\n")}`;
}
