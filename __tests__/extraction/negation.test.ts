import { describe, it, expect } from "vitest";
import { detectNegations } from "@/lib/eva/extraction/negation";

describe("negation", () => {
  it("detects explicit not", () => {
    const r = detectNegations("I do not want farmhouse style");
    expect(r.hasNegation).toBe(true);
    expect(r.negatedTerms).toContain("farmhouse");
    expect(r.negationType).toBe("explicit_not");
  });
  it("detects avoid pattern", () => {
    const r = detectNegations("avoid anything too modern");
    expect(r.hasNegation).toBe(true);
    expect(r.negationType).toBe("avoid");
  });
  it("detects nothing X as negation", () => {
    const r = detectNegations("nothing farmhouse please");
    expect(r.hasNegation).toBe(true);
  });
  it("returns no negation for positive message", () => {
    const r = detectNegations("I want a modern living room");
    expect(r.hasNegation).toBe(false);
    expect(r.negatedTerms).toHaveLength(0);
  });
});
