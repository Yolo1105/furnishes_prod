import { describe, expect, it } from "vitest";
import {
  LANDING_FREEZE_BOOT_SCRIPT,
  LANDING_FREEZE_KEY,
  LANDING_FREEZE_STYLE_ID,
  freezePixelIsHouseContent,
} from "./landing-freeze";

describe("landing freeze boot", () => {
  it("paints via a head style tag, not html attributes", () => {
    expect(LANDING_FREEZE_BOOT_SCRIPT).toContain(LANDING_FREEZE_KEY);
    expect(LANDING_FREEZE_BOOT_SCRIPT).toContain(LANDING_FREEZE_STYLE_ID);
    expect(LANDING_FREEZE_BOOT_SCRIPT).toContain("html::before");
    expect(LANDING_FREEZE_BOOT_SCRIPT).toContain(
      "furnishes-landing-intro-seen=1",
    );
    expect(LANDING_FREEZE_BOOT_SCRIPT).not.toContain(
      "background-color:#e83200",
    );
    expect(LANDING_FREEZE_BOOT_SCRIPT).not.toContain("classList");
    expect(LANDING_FREEZE_BOOT_SCRIPT).not.toContain("root.style");
  });
});

describe("freezePixelIsHouseContent", () => {
  it("rejects jpeg-black from a transparent canvas and empty orange", () => {
    expect(freezePixelIsHouseContent(0, 0, 0)).toBe(false);
    expect(freezePixelIsHouseContent(232, 50, 0)).toBe(false);
  });

  it("accepts cream house walls", () => {
    expect(freezePixelIsHouseContent(255, 232, 220)).toBe(true);
  });
});
