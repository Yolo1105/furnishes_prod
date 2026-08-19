import { describe, expect, it } from "vitest";
import { resolvedPublicOrigin } from "@/server/app-origin";

describe("resolvedPublicOrigin", () => {
  it("prefers APP_ORIGIN", () => {
    expect(
      resolvedPublicOrigin({
        APP_ORIGIN: "https://furnishes.example/",
        VERCEL_URL: "ignored.vercel.app",
      }),
    ).toBe("https://furnishes.example");
  });

  it("uses the Vercel host when APP_ORIGIN is unset", () => {
    expect(
      resolvedPublicOrigin({
        VERCEL_PROJECT_PRODUCTION_URL: "furnishes.vercel.app",
      }),
    ).toBe("https://furnishes.vercel.app");
  });

  it("returns empty when neither APP_ORIGIN nor Vercel hosts are set", () => {
    expect(resolvedPublicOrigin({})).toBe("");
  });
});
