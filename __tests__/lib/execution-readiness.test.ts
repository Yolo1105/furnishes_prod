import { describe, expect, it } from "vitest";
import { deriveExecutionReadiness } from "@/lib/eva/projects/execution-readiness";

describe("deriveExecutionReadiness", () => {
  it("returns finalized for done projects", () => {
    expect(
      deriveExecutionReadiness({
        projectStatus: "done",
        workflowStage: "intake",
        handoffReady: false,
        shortlistCount: 0,
        hasPrimaryShortlist: false,
        hasPreferredDirection: false,
        recommendationsHasSnapshot: false,
      }),
    ).toBe("finalized");
  });

  it("returns shortlisted when items exist but not execution-ready", () => {
    expect(
      deriveExecutionReadiness({
        projectStatus: "planning",
        workflowStage: "intake",
        handoffReady: false,
        shortlistCount: 2,
        hasPrimaryShortlist: false,
        hasPreferredDirection: false,
        recommendationsHasSnapshot: false,
      }),
    ).toBe("shortlisted");
  });

  it("returns ready_for_execution when handoff + primary + preferred + shortlist", () => {
    expect(
      deriveExecutionReadiness({
        projectStatus: "in_progress",
        workflowStage: "decision_handoff",
        handoffReady: true,
        shortlistCount: 1,
        hasPrimaryShortlist: true,
        hasPreferredDirection: true,
        recommendationsHasSnapshot: true,
      }),
    ).toBe("ready_for_execution");
  });
});
