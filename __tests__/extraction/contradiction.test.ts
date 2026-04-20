import { describe, it, expect, vi } from "vitest";
import {
  detectChangeIntent,
  checkContradiction,
} from "@/lib/eva/extraction/contradiction";

vi.mock("@/lib/eva/domain/fields", () => ({
  getFieldLabel: (field: string) => field,
}));

describe("contradiction", () => {
  describe("detectChangeIntent", () => {
    it("detects actually", () => {
      expect(detectChangeIntent("actually I want traditional")).toBe(true);
    });
    it("detects instead", () => {
      expect(detectChangeIntent("instead go with modern")).toBe(true);
    });
    it("returns false when no change intent", () => {
      expect(detectChangeIntent("I like modern style")).toBe(false);
    });
  });

  describe("checkContradiction", () => {
    it("allows update when no current preference", () => {
      const r = checkContradiction({}, "style", "modern", "I want modern");
      expect(r.hasConflict).toBe(false);
      expect(r.allowUpdate).toBe(true);
    });
    it("reports conflict when same field different value and no change intent", () => {
      const r = checkContradiction(
        { style: "modern" },
        "style",
        "traditional",
        "I prefer traditional",
      );
      expect(r.hasConflict).toBe(true);
      expect(r.allowUpdate).toBe(false);
      expect(r.confirmMessage).toContain("replace");
    });
    it("allows update when user has change intent", () => {
      const r = checkContradiction(
        { style: "modern" },
        "style",
        "traditional",
        "actually I want traditional",
      );
      expect(r.hasConflict).toBe(true);
      expect(r.allowUpdate).toBe(true);
    });
  });
});
