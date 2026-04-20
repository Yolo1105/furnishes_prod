import { createHash } from "crypto";
import type { ProjectExecutionLifecycle } from "@prisma/client";
import type { ProjectDecisionContext } from "@/lib/eva/projects/decision-schemas";

/** Minimal row shape for fingerprinting (avoids circular imports with build-project-summary). */
export type ShortlistFingerprintRow = {
  id: string;
  productName: string;
  status: string;
};
import type { ProjectExecutionState } from "@/lib/eva/projects/execution-state-schema";

/** Coherence of chosen path vs project reality — derived, not stored as enum in DB. */
export type PathIntegrityResult =
  | "valid"
  | "risky"
  | "blocked"
  | "needs_reevaluation";

export type ExecutionFingerprints = {
  decision: string;
  shortlist: string;
};

function hashPayload(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

export function computeExecutionFingerprints(input: {
  decision: ProjectDecisionContext | null;
  shortlistRows: ShortlistFingerprintRow[];
}): ExecutionFingerprints {
  const d = input.decision;
  const decisionPayload = JSON.stringify({
    prefLabel: d?.preferredPath?.label ?? "",
    prefItemIds: d?.preferredPath?.items?.map((i) => i.id) ?? [],
    constraints: d?.acceptedConstraints ?? [],
    compareCount: d?.comparisonCandidates?.length ?? 0,
    favArtifacts: d?.favoriteArtifactIds ?? [],
  });
  const shortlistPayload = [...input.shortlistRows]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((r) => `${r.id}:${r.status}:${r.productName}`)
    .join("|");
  return {
    decision: hashPayload(decisionPayload),
    shortlist: hashPayload(shortlistPayload),
  };
}

export function derivePathIntegrity(input: {
  handoffReady: boolean;
  hasPreferredDirection: boolean;
  hasPrimaryShortlist: boolean;
  acceptedConstraints: string[];
  activeBlockerCount: number;
  openUnresolvedCount: number;
  changeRequiresRevisit: boolean;
  workflowStage: string;
}): { result: PathIntegrityResult; reasons: string[] } {
  const reasons: string[] = [];

  if (input.activeBlockerCount > 0) {
    reasons.push(
      `${input.activeBlockerCount} active execution blocker(s) must be resolved.`,
    );
  }

  if (
    !input.hasPreferredDirection &&
    input.workflowStage === "decision_handoff"
  ) {
    reasons.push(
      "Preferred direction is not set while workflow expects handoff.",
    );
  }

  if (!input.hasPrimaryShortlist && input.handoffReady) {
    reasons.push(
      "No primary shortlist item while other readiness checks passed.",
    );
  }

  if (input.changeRequiresRevisit) {
    reasons.push(
      "Decision or shortlist changed since last evaluation — revisit rankings and assumptions.",
    );
    return {
      result: "needs_reevaluation",
      reasons,
    };
  }

  if (
    input.activeBlockerCount >= 2 ||
    (!input.hasPrimaryShortlist && input.workflowStage === "decision_handoff")
  ) {
    return {
      result: "blocked",
      reasons: reasons.length
        ? reasons
        : ["Execution path is blocked by missing requirements."],
    };
  }

  if (
    !input.hasPrimaryShortlist &&
    input.hasPreferredDirection &&
    input.openUnresolvedCount > 2
  ) {
    reasons.push(
      "Direction exists but shortlist and open items are not aligned.",
    );
    return { result: "risky", reasons };
  }

  if (input.acceptedConstraints.length === 0 && input.handoffReady) {
    reasons.push(
      "No explicit accepted constraints recorded — confirm non‑negotiables before purchase.",
    );
    return { result: "risky", reasons };
  }

  if (reasons.length > 0) {
    return { result: "risky", reasons };
  }

  return {
    result: "valid",
    reasons: [
      "Preferred direction, constraints, shortlist, and workflow gates are aligned for execution.",
    ],
  };
}

export function deriveNextBestAction(input: {
  integrity: PathIntegrityResult;
  workflowNextStep: string;
  activeBlockerTitles: string[];
  openTaskCount: number;
  hasPrimaryShortlist: boolean;
  hasPreferredDirection: boolean;
  executionLifecycle: ProjectExecutionLifecycle;
  handoffReady: boolean;
}): string {
  if (
    input.integrity === "blocked" ||
    input.integrity === "needs_reevaluation"
  ) {
    if (input.activeBlockerTitles.length > 0) {
      return `Address blockers first: ${input.activeBlockerTitles.slice(0, 3).join(" · ")}`;
    }
    if (input.integrity === "needs_reevaluation") {
      return "Re-check recommendations and shortlist against your updated direction or constraints.";
    }
    return "Resolve blocking gaps before placing orders or locking samples.";
  }

  if (!input.hasPreferredDirection) {
    return "Save a preferred direction when you have a clear front-runner.";
  }

  if (!input.hasPrimaryShortlist) {
    return "Mark one shortlist item as Primary so execution tasks and vendor handoff stay anchored.";
  }

  if (input.openTaskCount > 0 && input.handoffReady) {
    return `Complete ${input.openTaskCount} open execution task(s), then proceed to purchase or vendor outreach.`;
  }

  if (input.integrity === "risky") {
    return "Validate constraints and shortlist roles before committing — see integrity notes above.";
  }

  return input.workflowNextStep;
}

export function buildVolatileChangeImpact(input: {
  stored: ProjectExecutionState;
  fingerprints: ExecutionFingerprints;
}): {
  decisionFingerprintChanged: boolean;
  shortlistFingerprintChanged: boolean;
  affectedAreas: string[];
  stillValid: string[];
  mustRevisit: string[];
} {
  const prevD = input.stored.fingerprints?.decision;
  const prevS = input.stored.fingerprints?.shortlist;
  const decisionFingerprintChanged = Boolean(
    prevD && prevD !== input.fingerprints.decision,
  );
  const shortlistFingerprintChanged = Boolean(
    prevS && prevS !== input.fingerprints.shortlist,
  );

  const affectedAreas: string[] = [];
  const stillValid: string[] = [];
  const mustRevisit: string[] = [];

  if (decisionFingerprintChanged) {
    affectedAreas.push("Preferred direction / constraints / comparisons");
    mustRevisit.push(
      "Re-run recommendations if SKU choices assumed an old direction.",
    );
  } else if (prevD) {
    stillValid.push("Decision context fingerprint matches last evaluation.");
  }

  if (shortlistFingerprintChanged) {
    affectedAreas.push("Shortlist roles and product picks");
    mustRevisit.push(
      "Confirm primary/backup roles still match your latest plan.",
    );
  } else if (prevS) {
    stillValid.push("Shortlist fingerprint matches last evaluation.");
  }

  return {
    decisionFingerprintChanged,
    shortlistFingerprintChanged,
    affectedAreas,
    stillValid,
    mustRevisit,
  };
}

export function recommendedExecutionLifecycle(input: {
  integrity: PathIntegrityResult;
  activeBlockerCount: number;
  handoffReady: boolean;
}): ProjectExecutionLifecycle {
  if (input.activeBlockerCount > 0) return "blocked";
  if (input.integrity === "needs_reevaluation") return "in_progress";
  if (input.handoffReady && input.integrity === "valid") return "ready_handoff";
  if (input.integrity === "blocked") return "blocked";
  return "in_progress";
}
