import { describe, expect, it } from "vitest";
import { compareTwoPaths } from "@/lib/eva/projects/compare-recommendations";

describe("compareTwoPaths", () => {
  it("reports category overlap and uniqueness", () => {
    const a = [
      {
        id: "1",
        title: "Sofa",
        category: "seating",
        reasonWhyItFits: "x",
        estimatedPrice: 100,
      },
      {
        id: "2",
        title: "Lamp",
        category: "lighting",
        reasonWhyItFits: "y",
        estimatedPrice: 50,
      },
    ];
    const b = [
      {
        id: "3",
        title: "Sectional",
        category: "seating",
        reasonWhyItFits: "z",
        estimatedPrice: 200,
      },
      {
        id: "4",
        title: "Rug",
        category: "textiles",
        reasonWhyItFits: "w",
        estimatedPrice: 80,
      },
    ];
    const r = compareTwoPaths("North", a, "South", b);
    expect(r.overlapCategories).toContain("seating");
    expect(r.uniqueToA).toContain("lighting");
    expect(r.uniqueToB).toContain("textiles");
    expect(r.summary.length).toBeGreaterThan(10);
  });
});
