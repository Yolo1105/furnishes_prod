import { describe, it, expect } from "vitest";
import { PlaybookGraphBodySchema } from "@/lib/eva/playbook/graph-schema";

describe("PlaybookGraphBodySchema", () => {
  it("rejects edge pointing to missing node", () => {
    const r = PlaybookGraphBodySchema.safeParse({
      nodes: [
        {
          id: "a",
          x: 0,
          y: 0,
          w: 100,
          title: "A",
          body: "",
          type: "start",
          icon: "home",
          config: {},
        },
      ],
      edges: [{ id: "e1", from: "a", to: "missing" }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts minimal valid graph", () => {
    const r = PlaybookGraphBodySchema.safeParse({
      nodes: [
        {
          id: "a",
          x: 0,
          y: 0,
          w: 100,
          title: "A",
          body: "x",
          type: "start",
          icon: "home",
          config: {},
        },
        {
          id: "b",
          x: 1,
          y: 1,
          w: 100,
          title: "B",
          body: "y",
          type: "end",
          icon: "home",
          config: {},
        },
      ],
      edges: [{ id: "e1", from: "a", to: "b" }],
    });
    expect(r.success).toBe(true);
  });
});
