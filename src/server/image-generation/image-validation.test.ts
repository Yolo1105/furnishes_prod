import { describe, expect, it } from "vitest";
import { validateGeneratedImageBytes } from "./image-validation";

const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

describe("validateGeneratedImageBytes", () => {
  it("accepts a PNG signature", () => {
    const result = validateGeneratedImageBytes(PNG, "image/png");
    expect(result).toEqual({ ok: true, mimeType: "image/png" });
  });

  it("rejects non-image bytes", () => {
    const result = validateGeneratedImageBytes(
      new TextEncoder().encode("not-an-image"),
      "image/png",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/signature/i);
  });

  it("rejects empty payloads", () => {
    const result = validateGeneratedImageBytes(new Uint8Array(), "image/png");
    expect(result.ok).toBe(false);
  });
});
