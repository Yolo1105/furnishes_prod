import { describe, expect, it } from "vitest";
import { normalizePreferenceValue } from "./preference-normalization";

describe("preference normalization", () => {
  it("normalizes rooms and styles", () => {
    expect(normalizePreferenceValue("room", "Living Room")).toBe("living room");
    expect(normalizePreferenceValue("style", "scandi")).toBe("scandinavian");
    expect(normalizePreferenceValue("style", "minimal")).toBe("minimalist");
  });

  it("rejects generic values", () => {
    expect(normalizePreferenceValue("color", "color palette")).toBeNull();
    expect(normalizePreferenceValue("furniture", "  ")).toBeNull();
  });

  it("compacts furniture lists", () => {
    expect(normalizePreferenceValue("furniture", "Sofa,  Bed")).toBe(
      "sofa, bed",
    );
  });
});
