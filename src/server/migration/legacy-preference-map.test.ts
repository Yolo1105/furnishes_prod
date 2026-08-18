import { describe, expect, it } from "vitest";
import { mapLegacyPreferenceCategory } from "./legacy-preference-map";

describe("mapLegacyPreferenceCategory", () => {
  it("maps room / budget / style / color / furniture signals", () => {
    expect(mapLegacyPreferenceCategory({ group: "room", field: "main" })).toBe(
      "room",
    );
    expect(
      mapLegacyPreferenceCategory({ group: "budget", field: "range" }),
    ).toBe("budget");
    expect(
      mapLegacyPreferenceCategory({ group: "style", field: "aesthetic" }),
    ).toBe("style");
    expect(
      mapLegacyPreferenceCategory({ group: "style", field: "palette" }),
    ).toBe("color");
    expect(
      mapLegacyPreferenceCategory({ group: "musthaves", field: "sofa" }),
    ).toBe("furniture");
  });

  it("returns null for dealbreakers and unknown fields", () => {
    expect(
      mapLegacyPreferenceCategory({ group: "dealbreakers", field: "no pink" }),
    ).toBeNull();
    expect(mapLegacyPreferenceCategory({ field: "mystery" })).toBeNull();
  });
});
