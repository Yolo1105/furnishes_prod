/**
 * Deterministic recommendation ranking from lightweight project/user context.
 * Re-derived from legacy `lib/eva/intelligence/recommendation-ranking.ts`
 * without the full project-intelligence graph.
 */

export type RecommendationItem = {
  id: string;
  title: string;
  summary: string | null;
  reasonWhyItFits: string;
  category: string;
  relatedPreferences: string[];
  estimatedPrice: number | null;
  rank: number;
  discussionPrompt: string | null;
  explanationFactors?: string[];
  fitScore?: number;
  priceBandUsd?: { min: number; max: number } | null;
  specs?: string[];
  alternatives?: string[];
};

export type RecommendationRankingContext = {
  acceptedConstraints: string[];
  preferredPathItemTitles: string[];
  preferredPathNotes: string | null;
  preferredDirectionLabel: string | null;
  /** Inspiration / board titles (replaces legacy shortlist product names). */
  shortlistProductNames: string[];
  priorRecommendationTitles: string[];
};

const LIMITS = {
  rankingMinTokenLen: 3,
  rankingConstraintTokenMinLen: 4,
  rankingTitlePrefixChars: 15,
  rankingJaccardSimilarTitle: 0.45,
  rankingJaccardNotesVsItem: 0.08,
  rankingConstraintScoreCap: 4,
  rankingPreferredPathScore: 5,
  rankingNotesScore: 2,
  rankingLabelScore: 2,
  rankingSnapshotContinuityScore: 1,
  rankingShortlistOverlapPenalty: 3,
  rankingPreferredTitlePrefixMax: 24,
  rankingPreferredLabelPrefixMax: 20,
  rankingDisplayConstraintChars: 48,
  rankingDisplayTitleChars: 40,
  rankingDisplaySnapshotChars: 36,
  rankingMaxFactorsPerItem: 4,
};

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeText(s)
      .split(" ")
      .filter((w) => w.length > LIMITS.rankingMinTokenLen),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function similarTitle(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na.length < 4 || nb.length < 4) return false;
  const p = LIMITS.rankingTitlePrefixChars;
  if (na.includes(nb.slice(0, p)) || nb.includes(na.slice(0, p))) return true;
  return jaccard(tokenSet(a), tokenSet(b)) > LIMITS.rankingJaccardSimilarTitle;
}

export function scoreRecommendationAgainstContext(
  item: Pick<
    RecommendationItem,
    "title" | "summary" | "reasonWhyItFits" | "category"
  >,
  ctx: RecommendationRankingContext | null,
): { score: number; factors: string[] } {
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
      if (t.length > LIMITS.rankingConstraintTokenMinLen && itemToks.has(t)) {
        hit += 1;
      }
    }
    if (hit >= 1 && toks.size > 0) {
      score += Math.min(LIMITS.rankingConstraintScoreCap, 2 + hit);
      factors.push(
        `Satisfies a recorded constraint (${c.slice(0, LIMITS.rankingDisplayConstraintChars)}${c.length > LIMITS.rankingDisplayConstraintChars ? "…" : ""})`,
      );
      break;
    }
  }

  for (const t of ctx.preferredPathItemTitles) {
    const nt = normalizeText(t);
    if (
      nt.length > LIMITS.rankingConstraintTokenMinLen &&
      hayNorm.includes(
        nt.slice(0, Math.min(LIMITS.rankingPreferredTitlePrefixMax, nt.length)),
      )
    ) {
      score += LIMITS.rankingPreferredPathScore;
      factors.push(
        `Aligns with preferred direction item: ${t.slice(0, LIMITS.rankingDisplayTitleChars)}`,
      );
      break;
    }
  }

  if (ctx.preferredPathNotes && ctx.preferredPathNotes.length > 8) {
    const ja = jaccard(tokenSet(ctx.preferredPathNotes), tokenSet(hay));
    if (ja > LIMITS.rankingJaccardNotesVsItem) {
      score += LIMITS.rankingNotesScore;
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
        pl.slice(0, Math.min(LIMITS.rankingPreferredLabelPrefixMax, pl.length)),
      )
    ) {
      score += LIMITS.rankingLabelScore;
      factors.push(
        `Echoes preferred direction label “${ctx.preferredDirectionLabel.slice(0, LIMITS.rankingDisplayTitleChars)}”`,
      );
    }
  }

  for (const t of ctx.priorRecommendationTitles) {
    if (similarTitle(item.title, t)) {
      score += LIMITS.rankingSnapshotContinuityScore;
      factors.push(
        `Consistent with a prior recommendations snapshot (“${t.slice(0, LIMITS.rankingDisplaySnapshotChars)}${t.length > LIMITS.rankingDisplaySnapshotChars ? "…" : ""}”)`,
      );
      break;
    }
  }

  for (const sn of ctx.shortlistProductNames) {
    if (similarTitle(item.title, sn)) {
      score -= LIMITS.rankingShortlistOverlapPenalty;
      factors.push(
        `Overlaps shortlist product “${sn.slice(0, LIMITS.rankingDisplaySnapshotChars)}” — surface as complement or contrast unless the user asked for more of the same`,
      );
      break;
    }
  }

  return {
    score,
    factors: [...new Set(factors)].slice(0, LIMITS.rankingMaxFactorsPerItem),
  };
}

export function rankRecommendationsWithProjectContext(
  items: RecommendationItem[],
  ctx: RecommendationRankingContext | null,
): { items: RecommendationItem[]; scoreMax: number } {
  if (items.length === 0) return { items: [], scoreMax: 1 };
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

  const out = scored.map((row, i) => {
    const fit = Math.max(0, Math.min(1, row.score / scoreMax));
    return {
      ...row.it,
      rank: i + 1,
      ...(row.factors.length > 0 ? { explanationFactors: row.factors } : {}),
      fitScore: Number(fit.toFixed(3)),
    };
  });
  return { items: out, scoreMax };
}
