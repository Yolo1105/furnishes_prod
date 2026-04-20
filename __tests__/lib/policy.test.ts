import { describe, it, expect } from "vitest";
import { checkPolicy } from "@/lib/eva/policy/enforcement";

describe("policy enforcement", () => {
  it("does not block when no intent detected", () => {
    const r = checkPolicy("What color is the sky?", {});
    expect(r.blocked).toBe(false);
  });

  it("does not treat recommend a color palette as furniture_recs", () => {
    const r = checkPolicy("Can you recommend a color palette for my room?", {});
    expect(r.blocked).toBe(false);
  });

  it("blocks shopping_list when budget missing", () => {
    const r = checkPolicy("I want a shopping list for my room", {});
    expect(r.blocked).toBe(true);
    expect(r.clarificationMessage).toMatch(/budget/i);
  });

  it("allows shopping_list when budget present", () => {
    const r = checkPolicy("Give me a shopping list", { budget: "$5000" });
    expect(r.blocked).toBe(false);
  });

  it("blocks furniture_recs when roomType missing", () => {
    const r = checkPolicy("Recommend a sofa for me", {});
    expect(r.blocked).toBe(true);
    expect(r.clarificationMessage).toMatch(/room/i);
  });

  it("allows furniture_recs when roomType present", () => {
    const r = checkPolicy("Recommend a sofa", { roomType: "living room" });
    expect(r.blocked).toBe(false);
  });

  it("blocks layout_advice when roomDimensions missing", () => {
    const r = checkPolicy("Help me with the layout", { roomType: "bedroom" });
    expect(r.blocked).toBe(true);
    expect(r.clarificationMessage).toMatch(/dimension/i);
  });

  it("allows layout when roomType and roomDimensions present", () => {
    const r = checkPolicy("Layout for my room", {
      roomType: "bedroom",
      roomDimensions: "12x14",
    });
    expect(r.blocked).toBe(false);
  });
});
