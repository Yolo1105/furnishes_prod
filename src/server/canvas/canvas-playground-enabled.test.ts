import { describe, expect, it } from "vitest";
import { isCanvasPlaygroundEnabled } from "./canvas-playground-enabled";

describe("isCanvasPlaygroundEnabled", () => {
  it("is on by default", () => {
    expect(isCanvasPlaygroundEnabled({})).toBe(true);
  });

  it("turns off only when set to 0", () => {
    expect(isCanvasPlaygroundEnabled({ CANVAS_PLAYGROUND_ENABLED: "0" })).toBe(
      false,
    );
    expect(isCanvasPlaygroundEnabled({ CANVAS_PLAYGROUND_ENABLED: "1" })).toBe(
      true,
    );
  });
});
