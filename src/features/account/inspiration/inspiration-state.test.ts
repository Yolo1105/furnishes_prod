import { describe, expect, it } from "vitest";
import {
  countByFilter,
  filterInspirationItems,
  inspirationCardTitle,
  matchesFilter,
  matchesProject,
} from "./inspiration-state";
import type { InspirationDto } from "./inspiration-types";

function item(overrides: Partial<InspirationDto> = {}): InspirationDto {
  return {
    id: "item-1",
    title: null,
    note: null,
    roomLabel: null,
    colors: [],
    materials: [],
    projectId: null,
    projectName: null,
    uploadId: null,
    imageGenerationId: null,
    source: "uploaded",
    filename: "room.jpg",
    mimeType: "image/jpeg",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("matchesFilter", () => {
  it("matches everything for the all filter", () => {
    expect(matchesFilter(item({ source: "generated" }), "all")).toBe(true);
    expect(matchesFilter(item({ source: "uploaded" }), "all")).toBe(true);
  });

  it("matches the exact source otherwise", () => {
    expect(matchesFilter(item({ source: "generated" }), "generated")).toBe(
      true,
    );
    expect(matchesFilter(item({ source: "uploaded" }), "generated")).toBe(
      false,
    );
  });
});

describe("matchesProject", () => {
  it("matches any project when no filter is set", () => {
    expect(matchesProject(item({ projectId: "p1" }), null)).toBe(true);
  });

  it("matches only the selected project", () => {
    expect(matchesProject(item({ projectId: "p1" }), "p1")).toBe(true);
    expect(matchesProject(item({ projectId: "p2" }), "p1")).toBe(false);
    expect(matchesProject(item({ projectId: null }), "p1")).toBe(false);
  });
});

describe("filterInspirationItems", () => {
  it("combines source and project filters", () => {
    const items = [
      item({ id: "a", source: "generated", projectId: "p1" }),
      item({ id: "b", source: "uploaded", projectId: "p1" }),
      item({ id: "c", source: "generated", projectId: "p2" }),
    ];
    expect(filterInspirationItems(items, "generated", "p1")).toEqual([
      items[0],
    ]);
    expect(filterInspirationItems(items, "all", null)).toHaveLength(3);
  });
});

describe("inspirationCardTitle", () => {
  it("prefers the title", () => {
    expect(inspirationCardTitle(item({ title: "Sunroom" }))).toBe("Sunroom");
  });

  it("falls back to room label then source-aware defaults", () => {
    expect(inspirationCardTitle(item({ roomLabel: "Kitchen" }))).toBe(
      "Kitchen",
    );
    expect(
      inspirationCardTitle(item({ source: "generated", filename: null })),
    ).toBe("Warm minimal room study");
    expect(
      inspirationCardTitle(item({ source: "uploaded", filename: "loft.png" })),
    ).toBe("loft");
  });
});

describe("countByFilter", () => {
  it("counts items per filter", () => {
    const items = [
      item({ source: "generated" }),
      item({ source: "generated" }),
      item({ source: "uploaded" }),
    ];
    expect(countByFilter(items, "all")).toBe(3);
    expect(countByFilter(items, "generated")).toBe(2);
    expect(countByFilter(items, "uploaded")).toBe(1);
  });
});
