import { describe, expect, it } from "vitest";

describe("isStudioEnabled", () => {
  it("is off unless STUDIO_ENABLED=1", async () => {
    delete process.env.STUDIO_ENABLED;
    const { isStudioEnabled } = await import("./studio-enabled");
    expect(isStudioEnabled()).toBe(false);

    process.env.STUDIO_ENABLED = "0";
    expect(isStudioEnabled()).toBe(false);

    process.env.STUDIO_ENABLED = "1";
    expect(isStudioEnabled()).toBe(true);
  });
});
