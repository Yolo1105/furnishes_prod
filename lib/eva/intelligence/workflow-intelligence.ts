import type { WorkflowEvaluation } from "@/lib/eva/design-workflow/evaluate";
import {
  INTELLIGENCE_LIMITS,
  WORKFLOW_INTELLIGENCE_LAYER_COPY,
} from "@/lib/eva/intelligence/intelligence-constants";
import type { ProjectIntelligenceSignals } from "./project-intelligence-context";

const W = WORKFLOW_INTELLIGENCE_LAYER_COPY;

type UserIntentHint = "ask" | "compare" | "recommend" | "refine" | null;

function classifyUserIntent(userMessage: string): UserIntentHint {
  const m = userMessage.trim();
  if (!m) return null;
  if (
    /compare|versus|vs\b|side by side|trade-?off|difference between|option a|option b|weigh/i.test(
      m,
    )
  ) {
    return "compare";
  }
  if (
    /recommend|suggest|ideas for|show me (some )?options|what (should|would) i (pick|buy)|give me (a few )?directions/i.test(
      m,
    )
  ) {
    return "recommend";
  }
  if (
    /\?$/.test(m) ||
    /^(what|how|why|when|where|should i|is it|can you explain|help me understand|unsure|not sure)/i.test(
      m,
    )
  ) {
    return "ask";
  }
  if (
    /refine|instead|too |don't like|prefer|swap|cheaper|smaller|different|alternative|not that/i.test(
      m,
    )
  ) {
    return "refine";
  }
  return null;
}

/**
 * Layer project memory (constraints, preferred path, artifacts, comparisons) onto
 * baseline workflow evaluation so guidance is explainable and tied to saved state.
 */
export function refineWorkflowEvaluationWithIntelligence(
  base: WorkflowEvaluation,
  ctx: ProjectIntelligenceSignals,
  options?: { userMessage?: string },
): WorkflowEvaluation {
  const L = INTELLIGENCE_LIMITS;
  const userMessage = (options?.userMessage ?? "").trim();
  let evaNext = base.evaRecommendsNext;
  let transition = base.transitionExplanation;

  const hasPreferred =
    Boolean(ctx.preferredDirectionLabel) &&
    ctx.preferredPathItemTitles.length > 0;
  const compareCount = ctx.comparisonPathCount;
  const openItems = ctx.supplementaryOpenItems;
  const favTitles = ctx.highlightedArtifacts
    .slice(0, L.workflowRefineArtifactTitlesInCopy)
    .map((a) => a.title)
    .filter(Boolean);

  const appendTransition = (line: string) => {
    transition = `${transition}\n${line}`.trim();
  };

  const intent = classifyUserIntent(userMessage);
  if (intent === "compare" && compareCount >= 2) {
    appendTransition(W.intentCompare);
  } else if (intent === "ask") {
    appendTransition(W.intentAsk);
  } else if (intent === "recommend") {
    appendTransition(W.intentRecommend);
  } else if (intent === "refine" && hasPreferred) {
    appendTransition(W.intentRefine);
  }

  if (openItems.length > 0) {
    appendTransition(
      `${W.userFollowUpsPrefix} ${openItems.slice(0, L.workflowRefineOpenItemsInCopy).join(" · ")}`,
    );
  }

  const wantsCompare =
    /compare|versus|vs\b|side by side|trade-?off|difference between/i.test(
      userMessage,
    );

  const stage = base.stageId;

  const strongSignals =
    hasPreferred &&
    ctx.shortlistPrimaryNames.length > 0 &&
    ctx.acceptedConstraints.length > 0;

  if (
    stage === "decision_handoff" &&
    strongSignals &&
    base.missingFieldList.length === 0
  ) {
    appendTransition(W.progressHandoff);
  }

  if (
    (stage === "refinement" || stage === "recommendation_generation") &&
    hasPreferred &&
    base.stageComplete &&
    ctx.shortlistPrimaryNames.length === 0
  ) {
    appendTransition(W.readyPrimaryShortlist);
  }

  if (stage === "recommendation_generation") {
    if (hasPreferred && ctx.preferredDirectionLabel) {
      evaNext = `Prefer options consistent with preferred direction “${ctx.preferredDirectionLabel}” (saved on the project). ${evaNext}`;
    }
    if (compareCount >= 2) {
      if (wantsCompare) {
        evaNext = `Contrast the saved comparison paths before proposing unrelated new directions. ${evaNext}`;
      } else if (!hasPreferred) {
        evaNext = `If the user is still exploring, relate new ideas to one of the saved comparison paths or ask what is missing — avoid redundant unrelated SKUs. ${evaNext}`;
      }
    }
    if (ctx.acceptedConstraints.length > 0) {
      evaNext = `Respect accepted constraints: ${ctx.acceptedConstraints
        .slice(0, L.workflowRefineConstraintsInCopy)
        .join("; ")}. ${evaNext}`;
    }
  }

  if (
    (stage === "refinement" || stage === "recommendation_generation") &&
    favTitles.length > 0
  ) {
    evaNext = `When relevant, tie suggestions to starred files: ${favTitles.join(
      ", ",
    )}. ${evaNext}`;
  }

  if (stage === "refinement" && hasPreferred) {
    evaNext = `Offer tradeoffs and deltas vs the preferred path rather than many new unrelated ideas. ${evaNext}`;
  }

  if (
    stage === "decision_handoff" &&
    hasPreferred &&
    ctx.shortlistPrimaryNames.length === 0
  ) {
    appendTransition(W.preferredShortlistSharpens);
  }

  if (evaNext.length > L.workflowRefineEvaNextMaxChars) {
    evaNext = `${evaNext.slice(0, L.workflowRefineEvaNextMaxChars)}…`;
  }

  return {
    ...base,
    evaRecommendsNext: evaNext.trim(),
    transitionExplanation: transition.trim(),
  };
}
