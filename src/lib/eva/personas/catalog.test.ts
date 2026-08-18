import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSISTANT_PERSONA_ID,
  getAssistantPersonaById,
  isAssistantPersonaId,
  listAssistantPersonas,
  normalizeAssistantPersonaId,
} from "./catalog";

describe("assistant persona catalog", () => {
  it("contains exactly four definitions", () => {
    expect(listAssistantPersonas()).toHaveLength(4);
    expect(listAssistantPersonas().map((persona) => persona.id)).toEqual([
      "eva-general",
      "eva-style",
      "eva-plan",
      "eva-budget",
    ]);
  });

  it("normalizes unknown identifiers to eva-general", () => {
    expect(normalizeAssistantPersonaId("nope")).toBe(
      DEFAULT_ASSISTANT_PERSONA_ID,
    );
    expect(isAssistantPersonaId("eva-style")).toBe(true);
    expect(isAssistantPersonaId("custom")).toBe(false);
    expect(getAssistantPersonaById("eva-plan")?.tagline).toContain("Layout");
  });
});
