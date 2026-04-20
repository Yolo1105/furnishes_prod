import { describe, it, expect } from "vitest";
import { applyStyleColorRoutingHeuristics } from "@/lib/eva/extraction/field-routing-heuristics";

describe("applyStyleColorRoutingHeuristics", () => {
  it("moves color palette language from style to color", () => {
    const [a, b, c] = applyStyleColorRoutingHeuristics([
      { field: "style", text: "Color palette" },
      { field: "style", text: "coordinating colors" },
      { field: "style", text: "palette" },
    ]);
    expect(a.field).toBe("color");
    expect(b.field).toBe("color");
    expect(c.field).toBe("color");
  });

  it("keeps named design styles", () => {
    const [x] = applyStyleColorRoutingHeuristics([
      { field: "style", text: "scandinavian" },
    ]);
    expect(x.field).toBe("style");
  });

  it("moves bare palette to color when no style name", () => {
    const [x] = applyStyleColorRoutingHeuristics([
      { field: "style", text: "a warm palette for accents" },
    ]);
    expect(x.field).toBe("color");
  });
});
