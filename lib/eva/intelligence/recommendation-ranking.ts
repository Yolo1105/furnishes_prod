import { INTELLIGENCE_LIMITS } from "@/lib/eva/intelligence/intelligence-constants";
import type { NormalizedRecommendationItem } from "@/lib/eva-dashboard/conversation-output-types";
import type { ProjectIntelligenceContext } from "./project-intelligence-context";

export type RankedRecommendationResult = {
  items: NormalizedRecommendationItem[];
  /** Largest raw score in this batch (used to normalize fitScore). */
  scoreMax: number;
};

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  const L = INTELLIGENCE_LIMITS;
  return new Set(
    normalizeText(s)
      .split(" ")
      .filter((w) => w.length > L.rankingMinTokenLen),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function similarTitle(a: string, b: string): boolean {
  const L = INTELLIGENCE_LIMITS;
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na.length < 4 || nb.length < 4) return false;
  const p = L.rankingTitlePrefixChars;
  if (na.includes(nb.slice(0, p)) || nb.includes(na.slice(0, p))) return true;
  return jaccard(tokenSet(a), tokenSet(b)) > L.rankingJaccardSimilarTitle;
}

/**
 * Deterministic, testable scoring from real project signals (constraints, preferred path,
 * artifacts, shortlist, prior rec snapshot). Not a second opaque LLM pass.
 */
export function scoreRecommendationAgainstContext(
  item: Pick<
    NormalizedRecommendationItem,
    "title" | "summary" | "reasonWhyItFits" | "category"
  >,
  ctx: ProjectIntelligenceContext | null,
): { score: number; factors: string[] } {
  const L = INTELLIGENCE_LIMITS;
  const factors: string[] = [];
  if (!ctx) return { score: 0, factors: [] };

  const hay = `${item.title} ${item.summary ?? ""} ${item.reasonWhyItFits} ${item.category}`;
  const hayNorm = normalizeText(hay);
  let score = 0;

  for (const c of ctx.acceptedConstraints) {
    const toks = tokenSet(c);
    const itemToks = tokenSet(hay);
    let hit = 0;
    for (const t of toks) {
      if (t.length > L.rankingConstraintTokenMinLen && itemToks.has(t)) hit++;
    }
    if (hit >= 1 && toks.size > 0) {
      score += Math.min(L.rankingConstraintScoreCap, 2 + hit);
      factors.push(
        `Satisfies a recorded constraint (${c.slice(0, L.rankingDisplayConstraintChars)}${c.length > L.rankingDisplayConstraintChars ? "…" : ""})`,
      );
      break;
    }
  }

  for (const t of ctx.preferredPathItemTitles) {
    const nt = normalizeText(t);
    if (
      nt.length > L.rankingConstraintTokenMinLen &&
      hayNorm.includes(
        nt.slice(0, Math.min(L.rankingPreferredTitlePrefixMax, nt.length)),
      )
    ) {
      score += L.rankingPreferredPathScore;
      factors.push(
        `Aligns with preferred direction item: ${t.slice(0, L.rankingDisplayTitleChars)}`,
      );
      break;
    }
  }

  if (ctx.preferredPathNotes && ctx.preferredPathNotes.length > 8) {
    const ja = jaccard(tokenSet(ctx.preferredPathNotes), tokenSet(hay));
    if (ja > L.rankingJaccardNotesVsItem) {
      score += L.rankingNotesScore;
      factors.push(
        "Matches language from preferred-direction notes on this project",
      );
    }
  }

  if (ctx.preferredDirectionLabel && ctx.preferredDirectionLabel.length > 2) {
    const pl = normalizeText(ctx.preferredDirectionLabel);
    if (
      pl.length > 3 &&
      hayNorm.includes(
        pl.slice(0, Math.min(L.rankingPreferredLabelPrefixMax, pl.length)),
      )
    ) {
      score += L.rankingLabelScore;
      factors.push(
        `Echoes preferred direction label “${ctx.preferredDirectionLabel.slice(0, L.rankingDisplayTitleChars)}”`,
      );
    }
  }

  for (const a of ctx.highlightedArtifacts) {
    const base = a.title.replace(/\.[a-z0-9]+$/i, "");
    const fragment = normalizeText(base)
      .split(" ")
      .slice(0, L.rankingArtifactTitleWords)
      .join(" ");
    if (
      fragment.length > 6 &&
      hayNorm.includes(fragment.slice(0, L.rankingArtifactFragmentMaxChars))
    ) {
      score += L.rankingArtifactScore;
      factors.push(`Ties to highlighted project file: ${a.title}`);
    }
  }

  for (const t of ctx.recommendationsSnapshotSummary.topItemTitles) {
    if (similarTitle(item.title, t)) {
      score += L.rankingSnapshotContinuityScore;
      factors.push(
        `Consistent with a prior recommendations snapshot (“${t.slice(0, L.rankingDisplaySnapshotChars)}${t.length > L.rankingDisplaySnapshotChars ? "…" : ""}”)`,
      );
      break;
    }
  }

  for (const sn of ctx.shortlistProductNames) {
    if (similarTitle(item.title, sn)) {
      score -= L.rankingShortlistOverlapPenalty;
      factors.push(
        `Overlaps shortlist product “${sn.slice(0, L.rankingDisplaySnapshotChars)}” — surface as complement or contrast unless the user asked for more of the same`,
      );
      break;
    }
  }

  return {
    score,
    factors: [...new Set(factors)].slice(0, L.rankingMaxFactorsPerItem),
  };
}

export function rankRecommendationsWithProjectContext(
  items: NormalizedRecommendationItem[],
  ctx: ProjectIntelligenceContext | null,
): RankedRecommendationResult {
  if (items.length === 0) {
    return { items: [], scoreMax: 1 };
  }

  if (!ctx) {
    return {
      items: items.map((it, i) => ({ ...it, rank: i + 1 })),
      scoreMax: 1,
    };
  }

  const scored = items.map((it) => ({
    it,
    ...scoreRecommendationAgainstContext(it, ctx),
  }));

  let maxS = 0;
  for (const s of scored) {
    if (s.score > maxS) maxS = s.score;
  }
  const scoreMax = maxS > 0 ? maxS : 1;

  scored.sort((a, b) => b.score - a.score);

  const out: NormalizedRecommendationItem[] = scored.map((row, i) => {
    const fit = Math.max(0, Math.min(1, row.score / scoreMax));
    return {
      ...row.it,
      rank: i + 1,
      explanationFactors: row.factors.length > 0 ? row.factors : undefined,
      /** Relative strength vs best-scoring sibling; always set when project context exists. */
      fitScore: Number(fit.toFixed(3)),
    };
  });

  return { items: out, scoreMax };
}
