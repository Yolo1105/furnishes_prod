import { describe, expect, it } from "vitest";
import { buildPreferenceExtractionSystemPrompt } from "./preference-extraction-openai";

describe("buildPreferenceExtractionSystemPrompt", () => {
  it("includes style alias guidance from legacy extraction patterns", () => {
    const prompt = buildPreferenceExtractionSystemPrompt(4);
    expect(prompt).toContain("MCM");
    expect(prompt).toMatch(/mid-century modern/i);
    expect(prompt).toMatch(/scandi/i);
    expect(prompt).toMatch(/scandinavian/i);
    expect(prompt).toMatch(/boho/i);
  });

  it("covers the five allowed categories and budget formats", () => {
    const prompt = buildPreferenceExtractionSystemPrompt();
    expect(prompt).toContain("room, budget, style, color, furniture");
    expect(prompt).toMatch(/\$5k|under 10k/i);
    expect(prompt).toMatch(/master bedroom|home office/i);
  });

  it("instructs naming style conflicts instead of silently dropping one side", () => {
    const prompt = buildPreferenceExtractionSystemPrompt();
    expect(prompt).toMatch(/style conflict/i);
    expect(prompt).toMatch(/dominant\/accent|never silently/i);
  });

  it("does not introduce legacy-only dimension fields", () => {
    const prompt = buildPreferenceExtractionSystemPrompt();
    expect(prompt).not.toMatch(/roomWidth|doorPositions/i);
  });
});
