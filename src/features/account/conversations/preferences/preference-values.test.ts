import { describe, expect, it } from "vitest";
import {
  joinPreferenceValues,
  splitPreferenceValues,
} from "./preference-values";

describe("preference-values", () => {
  it("splits and dedupes comma-separated values", () => {
    expect(splitPreferenceValues("living room, Bedroom, living room")).toEqual([
      "living room",
      "Bedroom",
    ]);
  });

  it("joins trimmed unique values", () => {
    expect(joinPreferenceValues(["sofa", " sofa ", "bed", ""])).toBe(
      "sofa, bed",
    );
  });
});
