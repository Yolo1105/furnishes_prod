import { describe, expect, it } from "vitest";
import {
  getBedroomRugSize,
  getDeskDepth,
  getDiningRugSize,
  getDiningTableSize,
  getMinBedClearance,
  getRugSize,
  getTvViewingDistance,
  getWalkwayClearance,
  lookupDesignRules,
} from "./design-rules";

describe("design-rules", () => {
  describe("clearances", () => {
    it("returns typical walkway 36 inches", () => {
      expect(getWalkwayClearance("typical")).toBe(36);
    });
    it("returns major walkway 42 inches", () => {
      expect(getWalkwayClearance("major")).toBe(42);
    });
    it("returns between-furniture 30 inches", () => {
      expect(getWalkwayClearance("between-furniture")).toBe(30);
    });
    it("returns bed clearances sides 24 and foot 36", () => {
      const bed = getMinBedClearance();
      expect(bed.sides).toBe(24);
      expect(bed.foot).toBe(36);
    });
    it("returns desk depths by usage", () => {
      expect(getDeskDepth("laptop")).toBe(24);
      expect(getDeskDepth("desktop")).toBe(30);
      expect(getDeskDepth("drafting")).toBe(36);
    });
  });

  describe("rug-sizing", () => {
    it("getRugSize extends sofa width by config", () => {
      const r = getRugSize(84, "all-legs-on");
      expect(r.width).toBe(84 + 24 * 2);
    });
    it("getDiningRugSize adds 24 per side", () => {
      const r = getDiningRugSize(36, 72);
      expect(r.width).toBe(36 + 48);
      expect(r.length).toBe(72 + 48);
    });
    it("getBedroomRugSize for queen", () => {
      const r = getBedroomRugSize("queen");
      expect(r.width).toBe(60 + 24 * 2);
      expect(r.length).toBe(80 + 24);
    });
  });

  describe("dining and tv tables", () => {
    it("returns dining table size for 6 seats", () => {
      expect(getDiningTableSize(6)).toEqual({ width: 36, length: 72 });
    });
    it("returns tv viewing distance band", () => {
      expect(getTvViewingDistance(55)).toEqual({
        minInches: Math.round(55 * 1.5),
        maxInches: Math.round(55 * 2.5),
      });
    });
  });

  describe("lookupDesignRules", () => {
    it("returns null for non-layout messages", () => {
      expect(lookupDesignRules("I like navy and gold accents")).toBeNull();
      expect(lookupDesignRules("Thanks!")).toBeNull();
    });

    it("triggers on clearance / layout keywords", () => {
      const appendix = lookupDesignRules(
        "What clearance do I need for a walkway?",
      );
      expect(appendix).toBeTruthy();
      expect(appendix!).toContain("Walkway clearances");
      expect(appendix!).toContain("36");
    });

    it("triggers on rug keywords", () => {
      const appendix = lookupDesignRules("What rug size for my living room?");
      expect(appendix).toBeTruthy();
      expect(appendix!).toMatch(/Rug sizing/i);
    });

    it("triggers on arrange / where should i put", () => {
      expect(
        lookupDesignRules("Where should I put the sofa in this layout?"),
      ).toContain("[DESIGN RULES]");
      expect(
        lookupDesignRules("How should I arrange the furniture?"),
      ).toContain("Walkway clearances");
    });

    it("triggers on floor plan", () => {
      expect(lookupDesignRules("Help with my floor plan")).toContain(
        "[DESIGN RULES]",
      );
    });
  });
});
