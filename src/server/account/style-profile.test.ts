import { describe, expect, it } from "vitest";
import {
  getFullStyleProfile,
  getStyleProfile,
  updateStyleProfile,
} from "./style-profile";

describe("style-profile preferences merge", () => {
  it("exports getStyleProfile helpers", () => {
    expect(typeof getStyleProfile).toBe("function");
    expect(typeof getFullStyleProfile).toBe("function");
    expect(typeof updateStyleProfile).toBe("function");
  });
});
