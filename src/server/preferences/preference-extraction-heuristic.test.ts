import { describe, expect, it } from "vitest";
import { createHeuristicPreferenceExtractionProvider } from "./preference-extraction-heuristic";

describe("heuristic preference extraction", () => {
  const provider = createHeuristicPreferenceExtractionProvider();

  it("extracts explicit style and room statements", async () => {
    const candidates = await provider.extract({
      content: "I want a scandinavian living room with navy accents.",
      currentPreferences: {},
    });
    const categories = candidates.map((item) => item.category);
    expect(categories).toContain("style");
    expect(categories).toContain("room");
    expect(categories).toContain("color");
  });

  it("skips values that already match confirmed preferences", async () => {
    const candidates = await provider.extract({
      content: "Keep the living room scandi.",
      currentPreferences: { room: "living room", style: "scandinavian" },
    });
    expect(candidates.find((item) => item.category === "room")).toBeUndefined();
    expect(
      candidates.find((item) => item.category === "style"),
    ).toBeUndefined();
  });
});
