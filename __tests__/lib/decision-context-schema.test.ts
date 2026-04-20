import { describe, expect, it } from "vitest";
import {
  ProjectDecisionContextSchema,
  parseDecisionContext,
} from "@/lib/eva/projects/decision-schemas";

describe("ProjectDecisionContextSchema", () => {
  it("accepts supplementaryOpenItems", () => {
    const raw = {
      supplementaryOpenItems: ["Confirm lead time with vendor"],
      decisionNotes: "Testing oak finish",
    };
    const r = ProjectDecisionContextSchema.safeParse(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.supplementaryOpenItems).toEqual([
        "Confirm lead time with vendor",
      ]);
    }
  });

  it("parseDecisionContext returns null for invalid payloads", () => {
    expect(
      parseDecisionContext({ supplementaryOpenItems: ["x".repeat(500)] }),
    ).toBe(null);
  });
});
