import { z } from "zod";

/** Single source for `ProjectDecisionContextSchema` and decision UI (no duplicated magic numbers). */
export const DECISION_CONTEXT_LIMITS = {
  maxDecisionNotesChars: 8000,
  maxPreferredPathNotesChars: 4000,
  maxComparisonPaths: 5,
  maxConstraintStrings: 40,
  maxConstraintStringChars: 400,
  maxFavoriteArtifactIds: 32,
  /** Rows shown in workspace picker (full list still on server). */
  artifactPickerVisibleMax: 24,
  /** User-tracked follow-ups merged into project “open items” (persisted). */
  maxSupplementaryOpenItems: 12,
  maxSupplementaryOpenItemChars: 400,
} as const;

/** One saved recommendation row (matches NormalizedRecommendationItem shape subset). */
export const SnapshotRecommendationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  reasonWhyItFits: z.string(),
  category: z.string(),
  relatedPreferences: z.array(z.string()).optional(),
  estimatedPrice: z.number().nullable().optional(),
  rank: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  discussionPrompt: z.string().optional(),
});

export type SnapshotRecommendationItem = z.infer<
  typeof SnapshotRecommendationItemSchema
>;

export const RecommendationsSnapshotSchema = z.object({
  conversationId: z.string(),
  capturedAt: z.string(),
  items: z.array(SnapshotRecommendationItemSchema),
  suggestions: z.array(z.string()),
  budget_breakdown: z.record(z.string(), z.unknown()),
});

export type RecommendationsSnapshot = z.infer<
  typeof RecommendationsSnapshotSchema
>;

const CompareItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  category: z.string(),
  reasonWhyItFits: z.string(),
  estimatedPrice: z.number().nullable().optional(),
});

export const ComparisonPathSchema = z.object({
  id: z.string(),
  label: z.string(),
  items: z.array(CompareItemSchema),
  conversationId: z.string().optional(),
});

export const PreferredPathSchema = z.object({
  label: z.string(),
  pathId: z.string().optional(),
  items: z.array(CompareItemSchema),
  notes: z
    .string()
    .max(DECISION_CONTEXT_LIMITS.maxPreferredPathNotesChars)
    .optional(),
  updatedAt: z.string().optional(),
});

export const ProjectDecisionContextSchema = z.object({
  preferredPath: PreferredPathSchema.nullable().optional(),
  comparisonCandidates: z
    .array(ComparisonPathSchema)
    .max(DECISION_CONTEXT_LIMITS.maxComparisonPaths)
    .optional(),
  decisionNotes: z
    .string()
    .max(DECISION_CONTEXT_LIMITS.maxDecisionNotesChars)
    .optional(),
  acceptedConstraints: z
    .array(z.string().max(DECISION_CONTEXT_LIMITS.maxConstraintStringChars))
    .max(DECISION_CONTEXT_LIMITS.maxConstraintStrings)
    .optional(),
  favoriteArtifactIds: z
    .array(z.string())
    .max(DECISION_CONTEXT_LIMITS.maxFavoriteArtifactIds)
    .optional(),
  /** Explicit follow-ups the user wants tracked (merged with workflow-derived gaps). */
  supplementaryOpenItems: z
    .array(
      z.string().max(DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItemChars),
    )
    .max(DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItems)
    .optional(),
});

export type ProjectDecisionContext = z.infer<
  typeof ProjectDecisionContextSchema
>;

export function parseDecisionContext(
  raw: unknown,
): ProjectDecisionContext | null {
  if (raw == null) return null;
  const r = ProjectDecisionContextSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export function parseRecommendationsSnapshot(
  raw: unknown,
): RecommendationsSnapshot | null {
  if (raw == null) return null;
  const r = RecommendationsSnapshotSchema.safeParse(raw);
  return r.success ? r.data : null;
}
