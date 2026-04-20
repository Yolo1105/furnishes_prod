import { describe, expect, it } from "vitest";
import { minimalStudioSnapshotFixture } from "@/__tests__/fixtures/minimal-studio-snapshot";
import {
  parseStudioSnapshot,
  StudioSnapshotSchema,
} from "@/lib/eva/studio/studio-snapshot-schema";
import { studioSnapshotToPromptBlock } from "@/lib/eva/studio/studio-snapshot-to-prompt";

const minimalValid = { ...minimalStudioSnapshotFixture };

describe("StudioSnapshotSchema", () => {
  it("accepts a minimal valid payload", () => {
    const r = StudioSnapshotSchema.safeParse(minimalValid);
    expect(r.success).toBe(true);
  });

  it("rejects oversized prompt", () => {
    const bad = {
      ...minimalValid,
      designIntent: {
        ...minimalValid.designIntent,
        prompt: "x".repeat(20000),
      },
    };
    const r = StudioSnapshotSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("parseStudioSnapshot surfaces validation errors", () => {
    const r = parseStudioSnapshot({ ...minimalValid, activeProjectId: 123 });
    expect(r.success).toBe(false);
  });
});

describe("studioSnapshotToPromptBlock", () => {
  it("produces a compact non-JSON summary", () => {
    const parsed = StudioSnapshotSchema.parse(minimalValid);
    const block = studioSnapshotToPromptBlock(parsed);
    expect(block).toContain("Living room refresh");
    expect(block).toContain("Warm minimal");
    expect(block).not.toContain("{");
  });
});
