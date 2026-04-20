import { describe, it, expect } from "vitest";
import {
  getWalkwayClearance,
  getMinBedClearance,
  getDeskDepth,
  getRugSize,
  getDiningRugSize,
  getBedroomRugSize,
  parseRoomDimensions,
  parseLayoutOpenings,
  planLayout,
} from "@/lib/eva/design-rules";

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

  describe("parseRoomDimensions", () => {
    it("parses 12x14 feet", () => {
      const d = parseRoomDimensions("room is 12x14 feet");
      expect(d).not.toBeNull();
      expect(d!.widthInches).toBe(12 * 12);
      expect(d!.lengthInches).toBe(14 * 12);
    });
    it("parses 10 ft by 12 ft", () => {
      const d = parseRoomDimensions("10 ft by 12 ft");
      expect(d).not.toBeNull();
      expect(d!.widthInches).toBe(120);
      expect(d!.lengthInches).toBe(144);
    });
    it("returns null for no dimensions", () => {
      expect(parseRoomDimensions("just a living room")).toBeNull();
    });
  });

  describe("parseLayoutOpenings", () => {
    it("parses door on north wall", () => {
      const o = parseLayoutOpenings("door on the north wall");
      expect(o.doors).toHaveLength(1);
      expect(o.doors[0].wall).toBe("north");
      expect(o.windows).toHaveLength(0);
      expect(o.closets).toHaveLength(0);
    });
    it("parses window on east side", () => {
      const o = parseLayoutOpenings("window on the east side");
      expect(o.windows).toHaveLength(1);
      expect(o.windows[0].wall).toBe("east");
    });
    it("parses closet on south wall", () => {
      const o = parseLayoutOpenings("closet on south wall");
      expect(o.closets).toHaveLength(1);
      expect(o.closets[0].wall).toBe("south");
    });
    it("returns empty when no openings mentioned", () => {
      const o = parseLayoutOpenings("my bedroom is 12x14");
      expect(o.doors).toHaveLength(0);
      expect(o.windows).toHaveLength(0);
      expect(o.closets).toHaveLength(0);
    });
  });

  describe("planLayout", () => {
    it("returns layout options for room with dimensions and openings", () => {
      const options = planLayout({
        roomWidthInches: 12 * 12,
        roomLengthInches: 14 * 12,
        doors: [{ wall: "south", offsetInches: 0 }],
        windows: [],
        closets: [],
      });
      expect(options.length).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(3);
      expect(options[0].placements.length).toBeGreaterThan(0);
      expect(options[0].rationale).toBeTruthy();
    });
  });
});
