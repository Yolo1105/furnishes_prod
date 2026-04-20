import { describe, expect, it } from "vitest";

describe("project access role model", () => {
  it("viewer < editor < owner for hierarchy checks", () => {
    const rank = { viewer: 1, editor: 2, owner: 3 };
    expect(rank.editor).toBeGreaterThan(rank.viewer);
    expect(rank.owner).toBeGreaterThan(rank.editor);
  });
});
