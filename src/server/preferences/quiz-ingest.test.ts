import { describe, expect, it } from "vitest";
import {
  mapQuizResultToCandidates,
  quizResultIsFresh,
} from "@/server/preferences/quiz-ingest";
import type { QuizResultV1Parsed } from "@/lib/contracts/quiz-result";
import { assembleQuizResultV1 } from "@/features/quiz/assemble-quiz-result";

function sampleResult(
  overrides: Partial<QuizResultV1Parsed["answers"]> = {},
): QuizResultV1Parsed {
  return {
    version: 1,
    completedAt: new Date().toISOString(),
    answers: {
      style: { primary: "minimalist", secondary: ["organic"] },
      palette: {
        colors: ["warm linen", "soft taupe", "navy"],
        avoid: ["navy"],
      },
      roomFocus: "living room",
      budgetBand: "$5k–$15k",
      lifestyle: ["white space"],
      furniture: ["sofa", "coffee table"],
      ...overrides,
    },
    rawScores: { minimalist: 12, organic: 4 },
  };
}

describe("mapQuizResultToCandidates", () => {
  it("maps style primary/secondary with expected confidence", () => {
    const candidates = mapQuizResultToCandidates(sampleResult());
    const styles = candidates.filter((row) => row.category === "style");
    expect(styles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "style",
          value: "minimalist",
          confidence: 0.85,
        }),
        expect.objectContaining({
          category: "style",
          value: "organic",
          confidence: 0.6,
        }),
      ]),
    );
  });

  it("drops palette colors that appear in avoid (no exclusion proposals)", () => {
    const candidates = mapQuizResultToCandidates(sampleResult());
    const colors = candidates
      .filter((row) => row.category === "color")
      .map((row) => row.value);
    expect(colors).toContain("warm linen");
    expect(colors).not.toContain("navy");
    expect(candidates.some((row) => /avoid|exclusion/i.test(row.value))).toBe(
      false,
    );
  });

  it("maps room, budget, and furniture", () => {
    const candidates = mapQuizResultToCandidates(sampleResult());
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "room",
          value: "living room",
          confidence: 0.8,
        }),
        expect.objectContaining({
          category: "budget",
          confidence: 0.7,
        }),
        expect.objectContaining({
          category: "furniture",
          value: "sofa",
        }),
      ]),
    );
  });

  it("drops unknown / generic values instead of guessing", () => {
    const candidates = mapQuizResultToCandidates(
      sampleResult({
        style: { primary: "style", secondary: ["help"] },
        palette: { colors: ["palette", "ideas"], avoid: [] },
        roomFocus: "room",
        budgetBand: null,
        furniture: ["furniture"],
      }),
    );
    expect(candidates).toEqual([]);
  });
});

describe("quizResultIsFresh", () => {
  it("rejects results older than 7 days", () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(quizResultIsFresh(old)).toBe(false);
    expect(quizResultIsFresh(new Date().toISOString())).toBe(true);
  });
});

describe("assembleQuizResultV1", () => {
  it("builds a contract payload from quiz tally state", () => {
    const result = assembleQuizResultV1({
      tally: {
        minimal: 10,
        organic: 4,
        maximalist: 0,
        industrial: 0,
        artisan: 0,
      },
      answers: {
        b2a: "b2a-lr",
        b1: { path: "guided" },
        r10: ["r10-sofa", "r10-coffee-table"],
      },
      budgetRange: [5000, 15000],
    });
    expect(result.version).toBe(1);
    expect(result.answers.style.primary).toBe("minimalist");
    expect(result.answers.style.secondary).toContain("organic");
    expect(result.answers.roomFocus).toBe("living room");
    expect(result.answers.budgetBand).toMatch(/\$5k/);
    expect(result.answers.furniture).toContain("sofa");
    expect(result.answers.palette.avoid).toEqual([]);
  });
});
