import { describe, expect, it } from "vitest";
import {
  buildVolatileChangeImpact,
  computeExecutionFingerprints,
  deriveNextBestAction,
  derivePathIntegrity,
  recommendedExecutionLifecycle,
} from "@/lib/eva/projects/execution-orchestration";

describe("computeExecutionFingerprints", () => {
  it("is stable for identical inputs", () => {
    const rows = [
      { id: "a", productName: "Sofa", status: "primary" },
      { id: "b", productName: "Chair", status: "backup" },
    ];
    const compareItem = {
      id: "x",
      title: "Sofa",
      category: "seating",
      reasonWhyItFits: "Matches style",
      summary: null as string | null,
    };
    const a = computeExecutionFingerprints({
      decision: {
        preferredPath: { label: "A", items: [compareItem] },
        acceptedConstraints: ["c1"],
        comparisonCandidates: [],
        favoriteArtifactIds: [],
      },
      shortlistRows: rows,
    });
    const b = computeExecutionFingerprints({
      decision: {
        preferredPath: { label: "A", items: [compareItem] },
        acceptedConstraints: ["c1"],
        comparisonCandidates: [],
        favoriteArtifactIds: [],
      },
      shortlistRows: rows,
    });
    expect(a.decision).toBe(b.decision);
    expect(a.shortlist).toBe(b.shortlist);
  });

  it("changes when shortlist order differs (sorted by id)", () => {
    const rowsA = [
      { id: "a", productName: "Sofa", status: "primary" },
      { id: "b", productName: "Chair", status: "backup" },
    ];
    const rowsB = [...rowsA].reverse();
    const fa = computeExecutionFingerprints({
      decision: null,
      shortlistRows: rowsA,
    });
    const fb = computeExecutionFingerprints({
      decision: null,
      shortlistRows: rowsB,
    });
    expect(fa.shortlist).toBe(fb.shortlist);
  });

  it("changes when product name changes", () => {
    const fa = computeExecutionFingerprints({
      decision: null,
      shortlistRows: [{ id: "a", productName: "Sofa", status: "primary" }],
    });
    const fb = computeExecutionFingerprints({
      decision: null,
      shortlistRows: [{ id: "a", productName: "Loveseat", status: "primary" }],
    });
    expect(fa.shortlist).not.toBe(fb.shortlist);
  });
});

describe("derivePathIntegrity", () => {
  it("returns needs_reevaluation when changeRequiresRevisit", () => {
    const r = derivePathIntegrity({
      handoffReady: true,
      hasPreferredDirection: true,
      hasPrimaryShortlist: true,
      acceptedConstraints: ["x"],
      activeBlockerCount: 0,
      openUnresolvedCount: 0,
      changeRequiresRevisit: true,
      workflowStage: "decision_handoff",
    });
    expect(r.result).toBe("needs_reevaluation");
    expect(r.reasons.some((x) => x.includes("changed"))).toBe(true);
  });

  it("returns blocked when multiple active blockers", () => {
    const r = derivePathIntegrity({
      handoffReady: true,
      hasPreferredDirection: true,
      hasPrimaryShortlist: true,
      acceptedConstraints: ["x"],
      activeBlockerCount: 2,
      openUnresolvedCount: 0,
      changeRequiresRevisit: false,
      workflowStage: "decision_handoff",
    });
    expect(r.result).toBe("blocked");
  });

  it("returns valid when aligned", () => {
    const r = derivePathIntegrity({
      handoffReady: true,
      hasPreferredDirection: true,
      hasPrimaryShortlist: true,
      acceptedConstraints: ["budget"],
      activeBlockerCount: 0,
      openUnresolvedCount: 0,
      changeRequiresRevisit: false,
      workflowStage: "decision_handoff",
    });
    expect(r.result).toBe("valid");
  });

  it("returns risky when handoff-ready but no constraints", () => {
    const r = derivePathIntegrity({
      handoffReady: true,
      hasPreferredDirection: true,
      hasPrimaryShortlist: true,
      acceptedConstraints: [],
      activeBlockerCount: 0,
      openUnresolvedCount: 0,
      changeRequiresRevisit: false,
      workflowStage: "decision_handoff",
    });
    expect(r.result).toBe("risky");
  });
});

describe("deriveNextBestAction", () => {
  it("prioritizes blocker titles when integrity is blocked", () => {
    const s = deriveNextBestAction({
      integrity: "blocked",
      workflowNextStep: "Next workflow",
      activeBlockerTitles: ["Measure window", "Confirm fabric"],
      openTaskCount: 0,
      hasPrimaryShortlist: true,
      hasPreferredDirection: true,
      executionLifecycle: "blocked",
      handoffReady: true,
    });
    expect(s).toContain("Measure window");
    expect(s).toContain("Confirm fabric");
  });

  it("asks for primary shortlist when direction exists but no primary", () => {
    const s = deriveNextBestAction({
      integrity: "valid",
      workflowNextStep: "WF",
      activeBlockerTitles: [],
      openTaskCount: 0,
      hasPrimaryShortlist: false,
      hasPreferredDirection: true,
      executionLifecycle: "in_progress",
      handoffReady: false,
    });
    expect(s.toLowerCase()).toContain("primary");
  });

  it("falls back to workflow next step when healthy", () => {
    const s = deriveNextBestAction({
      integrity: "valid",
      workflowNextStep: "Upload floor plan",
      activeBlockerTitles: [],
      openTaskCount: 0,
      hasPrimaryShortlist: true,
      hasPreferredDirection: true,
      executionLifecycle: "in_progress",
      handoffReady: true,
    });
    expect(s).toBe("Upload floor plan");
  });
});

describe("buildVolatileChangeImpact", () => {
  it("detects decision fingerprint drift", () => {
    const v = buildVolatileChangeImpact({
      stored: {
        fingerprints: { decision: "aaa", shortlist: "bbb" },
      },
      fingerprints: { decision: "ccc", shortlist: "bbb" },
    });
    expect(v.decisionFingerprintChanged).toBe(true);
    expect(v.shortlistFingerprintChanged).toBe(false);
    expect(v.affectedAreas.join(" ")).toContain("direction");
  });

  it("treats missing prior fingerprints as no drift", () => {
    const v = buildVolatileChangeImpact({
      stored: {},
      fingerprints: { decision: "x", shortlist: "y" },
    });
    expect(v.decisionFingerprintChanged).toBe(false);
    expect(v.shortlistFingerprintChanged).toBe(false);
    expect(v.stillValid).toEqual([]);
  });
});

describe("recommendedExecutionLifecycle", () => {
  it("returns blocked when blockers exist", () => {
    expect(
      recommendedExecutionLifecycle({
        integrity: "valid",
        activeBlockerCount: 1,
        handoffReady: true,
      }),
    ).toBe("blocked");
  });

  it("returns ready_handoff when valid and ready", () => {
    expect(
      recommendedExecutionLifecycle({
        integrity: "valid",
        activeBlockerCount: 0,
        handoffReady: true,
      }),
    ).toBe("ready_handoff");
  });
});
