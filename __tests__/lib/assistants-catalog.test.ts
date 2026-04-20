import { describe, it, expect } from "vitest";
import {
  DEFAULT_ASSISTANT_ID,
  getAssistantById,
  listAssistantFocusFilters,
  listAssistants,
  normalizeAssistantId,
} from "@/lib/eva/assistants/catalog";

describe("assistants catalog", () => {
  it("lists four distinct assistants", () => {
    const list = listAssistants();
    expect(list.length).toBe(4);
    const ids = new Set(list.map((a) => a.id));
    expect(ids.size).toBe(4);
  });

  it("normalizes unknown ids to default", () => {
    expect(normalizeAssistantId("not-real")).toBe(DEFAULT_ASSISTANT_ID);
    expect(getAssistantById("not-real").id).toBe(DEFAULT_ASSISTANT_ID);
  });

  it("preserves valid ids", () => {
    expect(normalizeAssistantId("eva-style")).toBe("eva-style");
    expect(getAssistantById("eva-budget").focus).toBe("budget");
  });

  it("focus filter tabs cover every catalog focus value", () => {
    const focuses = new Set(listAssistants().map((a) => a.focus));
    const tabValues = new Set(
      listAssistantFocusFilters()
        .map((t) => t.value)
        .filter((v): v is NonNullable<typeof v> => v !== ""),
    );
    for (const f of focuses) {
      expect(tabValues.has(f)).toBe(true);
    }
  });
});
