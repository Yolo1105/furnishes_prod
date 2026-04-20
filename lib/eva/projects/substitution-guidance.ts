import type { ShortlistItemExternalLifecycle } from "@prisma/client";
import type { SnapshotRecommendationItem } from "@/lib/eva/projects/decision-schemas";
import { SUBSTITUTION_GUIDANCE_COPY } from "@/lib/eva/projects/summary-constants";

export type SubstitutionCandidateDto = {
  recommendationId: string;
  title: string;
  category: string;
  reasonWhyItFits: string;
  estimatedPriceCents: number | null;
  /** Display role for UI */
  role: "strongest" | "budget" | "style_alt";
};

/**
 * Centralized, explainable substitution view for a shortlist row — grounded in the saved
 * recommendations snapshot (no fabricated SKUs).
 */
export type SubstitutionGuidanceDto = {
  shortlistItemId: string;
  productName: string;
  lifecycle: ShortlistItemExternalLifecycle;
  impactSummary: string[];
  stillValid: string[];
  mustRevisit: string[];
  honestNextStep: string;
  candidates: SubstitutionCandidateDto[];
};

const PROBLEMATIC: ShortlistItemExternalLifecycle[] = [
  "unavailable",
  "replaced",
  "rejected",
];

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function shortlistNeedsSubstitutionGuidance(
  externalLifecycle: ShortlistItemExternalLifecycle,
): boolean {
  return PROBLEMATIC.includes(externalLifecycle);
}

export function buildSubstitutionGuidance(input: {
  row: {
    id: string;
    productName: string;
    productCategory: string;
    priceCents: number;
    externalLifecycle: ShortlistItemExternalLifecycle;
    sourceRecommendationId: string | null;
    status: string;
  };
  snapshotItems: SnapshotRecommendationItem[];
}): SubstitutionGuidanceDto {
  const { row, snapshotItems } = input;

  const impactSummary: string[] = [];
  if (row.externalLifecycle === "unavailable") {
    impactSummary.push(
      SUBSTITUTION_GUIDANCE_COPY.impactUnavailable(row.productName),
    );
  } else if (row.externalLifecycle === "replaced") {
    impactSummary.push(
      SUBSTITUTION_GUIDANCE_COPY.impactReplaced(row.productName),
    );
  } else if (row.externalLifecycle === "rejected") {
    impactSummary.push(
      SUBSTITUTION_GUIDANCE_COPY.impactRejected(row.productName),
    );
  }

  const pool = snapshotItems.filter((it) => {
    if (it.id === row.sourceRecommendationId) return false;
    return true;
  });

  const sameCat = pool.filter(
    (it) => norm(it.category) === norm(row.productCategory),
  );
  const ordered = sameCat.length > 0 ? [...sameCat] : [...pool];

  ordered.sort((a, b) => {
    const ra = a.rank ?? 999;
    const rb = b.rank ?? 999;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title);
  });

  const candidates: SubstitutionCandidateDto[] = [];
  if (ordered.length > 0) {
    const strongest = ordered[0]!;
    candidates.push({
      recommendationId: strongest.id,
      title: strongest.title,
      category: strongest.category,
      reasonWhyItFits: strongest.reasonWhyItFits,
      estimatedPriceCents:
        strongest.estimatedPrice != null
          ? Math.round(strongest.estimatedPrice * 100)
          : null,
      role: "strongest",
    });
  }

  const pricePool = sameCat.length > 0 ? sameCat : ordered;
  const withPrice = pricePool.filter((i) => i.estimatedPrice != null);
  if (withPrice.length > 0) {
    const cheapest = [...withPrice].sort(
      (a, b) => (a.estimatedPrice ?? 0) - (b.estimatedPrice ?? 0),
    )[0]!;
    if (!candidates.some((c) => c.recommendationId === cheapest.id)) {
      candidates.push({
        recommendationId: cheapest.id,
        title: cheapest.title,
        category: cheapest.category,
        reasonWhyItFits: cheapest.reasonWhyItFits,
        estimatedPriceCents:
          cheapest.estimatedPrice != null
            ? Math.round(cheapest.estimatedPrice * 100)
            : null,
        role: "budget",
      });
    }
  }

  if (ordered.length > 1) {
    const alt = ordered.find((it) => it.id !== ordered[0]!.id);
    if (alt && !candidates.some((c) => c.recommendationId === alt.id)) {
      candidates.push({
        recommendationId: alt.id,
        title: alt.title,
        category: alt.category,
        reasonWhyItFits: alt.reasonWhyItFits,
        estimatedPriceCents:
          alt.estimatedPrice != null
            ? Math.round(alt.estimatedPrice * 100)
            : null,
        role: "style_alt",
      });
    }
  }

  const stillValid: string[] = [SUBSTITUTION_GUIDANCE_COPY.stillValidDefault];

  const mustRevisit: string[] = [
    SUBSTITUTION_GUIDANCE_COPY.mustRevisitPrimaryRole,
    SUBSTITUTION_GUIDANCE_COPY.mustRevisitRefreshRecs,
  ];

  let honestNextStep: string;
  if (snapshotItems.length === 0) {
    honestNextStep = SUBSTITUTION_GUIDANCE_COPY.honestNoSnapshot;
  } else if (candidates.length === 0) {
    honestNextStep = SUBSTITUTION_GUIDANCE_COPY.honestNoCandidates;
  } else {
    honestNextStep = SUBSTITUTION_GUIDANCE_COPY.honestHasCandidates;
  }

  return {
    shortlistItemId: row.id,
    productName: row.productName,
    lifecycle: row.externalLifecycle,
    impactSummary,
    stillValid: [...new Set(stillValid)].slice(0, 8),
    mustRevisit: [...new Set(mustRevisit)].slice(0, 8),
    honestNextStep,
    candidates: candidates.slice(0, 4),
  };
}
