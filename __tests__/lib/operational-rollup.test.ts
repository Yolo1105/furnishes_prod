import { describe, expect, it } from "vitest";
import { deriveOperationalExecutionPhase } from "@/lib/eva/projects/operational-rollup";

describe("deriveOperationalExecutionPhase", () => {
  it("returns review_pending when handoff approval is pending", () => {
    const r = deriveOperationalExecutionPhase({
      hasPendingHandoffApproval: true,
      hasActiveExecutionBlockers: false,
      primaryItems: [],
      allItems: [],
    });
    expect(r.phase).toBe("review_pending");
  });

  it("returns needs_substitution when primary item is unavailable", () => {
    const r = deriveOperationalExecutionPhase({
      hasPendingHandoffApproval: false,
      hasActiveExecutionBlockers: false,
      primaryItems: [{ externalLifecycle: "unavailable" }],
      allItems: [{ externalLifecycle: "unavailable" }],
    });
    expect(r.phase).toBe("needs_substitution");
  });

  it("returns sourcing_in_progress when any item is sourcing", () => {
    const r = deriveOperationalExecutionPhase({
      hasPendingHandoffApproval: false,
      hasActiveExecutionBlockers: false,
      primaryItems: [{ externalLifecycle: "approved" }],
      allItems: [
        { externalLifecycle: "approved" },
        { externalLifecycle: "sourcing" },
      ],
    });
    expect(r.phase).toBe("sourcing_in_progress");
  });
});
