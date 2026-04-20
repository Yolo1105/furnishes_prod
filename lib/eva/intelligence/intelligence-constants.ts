import { DECISION_CONTEXT_LIMITS } from "@/lib/eva/projects/decision-schemas";
import { PROJECT_SUMMARY_LIMITS } from "@/lib/eva/projects/summary-constants";

/**
 * Single place for intelligence-layer limits (prompts, ranking, workflow refinement).
 * Prefer referencing schema/summary caps here rather than scattering literals.
 */
export const INTELLIGENCE_LIMITS = {
  /** JSON payload: brief snapshot keys in system / rec prompts */
  promptBriefLineMax: PROJECT_SUMMARY_LIMITS.briefMaxEntriesSummary,
  /** Cap strings sent to the LLM (full list remains in DB) */
  promptConstraintsMax: Math.min(
    20,
    DECISION_CONTEXT_LIMITS.maxConstraintStrings,
  ),
  promptSupplementaryOpenMax: DECISION_CONTEXT_LIMITS.maxSupplementaryOpenItems,
  promptPreferredPathTitlesMax: 8,
  promptSnapshotTitlesMax: 8,
  promptShortlistNamesSampleMax: 12,

  recentChatMessagesTake: 4,
  recentChatMessagePreviewChars: 400,
  recentChatExcerptMaxChars: 1200,

  recentWorkflowEventsTake: 4,

  /** Ranking / fuzzy match (deterministic scorer) */
  rankingMinTokenLen: 3,
  rankingConstraintTokenMinLen: 4,
  rankingTitlePrefixChars: 15,
  rankingPreferredTitlePrefixMax: 28,
  rankingPreferredLabelPrefixMax: 32,
  rankingArtifactTitleWords: 5,
  rankingArtifactFragmentMaxChars: 48,
  rankingJaccardSimilarTitle: 0.45,
  rankingJaccardNotesVsItem: 0.08,
  rankingConstraintScoreCap: 4,
  rankingPreferredPathScore: 5,
  rankingNotesScore: 2,
  rankingLabelScore: 1.5,
  rankingArtifactScore: 2,
  rankingSnapshotContinuityScore: 1.5,
  rankingShortlistOverlapPenalty: 3,
  rankingMaxFactorsPerItem: 6,
  rankingDisplayConstraintChars: 80,
  rankingDisplayTitleChars: 60,
  rankingDisplaySnapshotChars: 50,

  workflowRefineEvaNextMaxChars: 900,
  workflowRefineOpenItemsInCopy: 4,
  workflowRefineArtifactTitlesInCopy: 3,
  workflowRefineConstraintsInCopy: 4,

  projectInsightsBlockersMax: 8,

  /** Default discussion prompt trims `reasonWhyItFits` to keep copy short. */
  discussionPromptReasonPreviewChars: 120,
} as const;

/**
 * Explainable transition lines layered onto baseline workflow evaluation
 * (`refineWorkflowEvaluationWithIntelligence`) — single source, no duplicate prose in components.
 */
export const WORKFLOW_INTELLIGENCE_LAYER_COPY = {
  intentCompare:
    "Intent: compare — ground answers in saved comparison paths before introducing unrelated SKUs.",
  intentAsk:
    "Intent: clarify — answer the question directly, then tie back to saved constraints and direction.",
  intentRecommend:
    "Intent: recommend — prioritize options that honor accepted constraints and the preferred direction when set.",
  intentRefine:
    "Intent: refine — adjust relative to the preferred path instead of restarting from scratch.",
  progressHandoff:
    "Project state suggests you can progress: preferred direction, primary shortlist, and constraints are all set — confirm handoff packet and any team approvals.",
  readyPrimaryShortlist:
    "Ready to narrow execution: pick a primary shortlist item when you’re satisfied with direction.",
  preferredShortlistSharpens:
    "Preferred direction is set; confirming a primary shortlist item sharpens execution readiness.",
  userFollowUpsPrefix: "User-tracked follow-ups:",
} as const;
