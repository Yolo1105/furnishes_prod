/**
 * Shared shapes for Recommendations and Files (client + API alignment).
 */

export type RecommendationsMetaState =
  | "ok"
  | "disabled"
  | "llm_unconfigured"
  | "insufficient_preferences";

export interface NormalizedRecommendationItem {
  id: string;
  title: string;
  summary: string | null;
  reasonWhyItFits: string;
  category: string;
  relatedPreferences: string[];
  estimatedPrice: number | null;
  rank: number | null;
  imageUrl: string | null;
  discussionPrompt: string;
  /** Grounded ranking factors from project intelligence (deterministic). */
  explanationFactors?: string[];
  /** Normalized strength vs best-scoring sibling in this batch (0–1). */
  fitScore?: number | null;
}

/** One category line inside `budget_breakdown` (from LLM JSON). */
export interface BudgetBreakdownLine {
  amount?: number;
  range?: string;
  notes?: string;
}

export interface ConversationRecommendationsPayload {
  items: NormalizedRecommendationItem[];
  suggestions: string[];
  budget_breakdown: Record<string, BudgetBreakdownLine>;
  meta?: {
    state: RecommendationsMetaState;
    message?: string;
    /** True when order was re-ranked using saved project intelligence (deterministic). */
    projectRankingApplied?: boolean;
  };
}

/** Derived from Prisma `File` + GET /api/conversations/[id]/files */
export type ConversationArtifactKind =
  | "image"
  | "pdf"
  | "floorplan"
  | "document"
  | "other";

export interface ConversationArtifact {
  id: string;
  conversationId: string;
  title: string;
  /** Derived from mime + kind + provenance until DB stores user descriptions. */
  description: string;
  fileType: ConversationArtifactKind;
  mimeType: string | null;
  /** Inline preview (image src, etc.) — storage URL as stored in DB. */
  previewUrl: string;
  /**
   * Same-origin path to stream bytes via server (mediates CORS / private URLs).
   * GET with session cookie; not a raw third-party URL.
   */
  downloadUrl: string;
  createdAt: string;
  /** Derived from kind + sourceType until DB has a tags column. */
  tags: string[];
  sourceType: "remote" | "upload";
  /**
   * True when a download can be attempted via `downloadUrl` (proxied route).
   * False when there is no storage URL to resolve.
   */
  downloadable: boolean;
}
