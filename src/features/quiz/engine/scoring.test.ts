import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assembleQuizResultV1 } from "@/features/quiz/assemble-quiz-result";
import {
  calculateTally,
  computeBudgetRange,
  rankTally,
} from "@/features/quiz/engine/scoring";
import type { QuizAnswers } from "@/features/quiz/data/types";

/** Fixture A — strong minimal lean via scored style answers. */
const FIXTURE_A: QuizAnswers = {
  s1: ["s1c", "s1f"],
  s2: ["s2-calm", "s2-airy", "s2-minimal", "s2-clean"],
  s3: ["s3a"],
  s4: { p3: "right", p4: "right", p6: "left", p7: "left" },
  s5: "s5-whisper",
  s6: ["s6-lw", "s6-mb", "s6-li"],
  s7: { lighting: 20, storage: 30 },
  s10: "s10b",
  s12: ["s12a"],
  b2a: "b2a-lr",
  b2b: "b2b-md",
  b2c: "b2c-so",
  b2d: "b2d-md",
  b2e: "b2e-mid",
  b2f: "b2f-bal",
  b1: { path: "guided" },
  r10: ["r10-sofa", "r10-floor-lamp"],
};

/** Fixture B — maximalist lean. */
const FIXTURE_B: QuizAnswers = {
  s1: ["s1d", "s1a", "s1e"],
  s2: ["s2-layered", "s2-playful", "s2-collected", "s2-warm"],
  s3: ["s3b"],
  s4: { p3: "left", p4: "left", p6: "right", p7: "right" },
  s5: "s5-dusk",
  s6: ["s6-ve", "s6-br", "s6-bo"],
  s7: { lighting: 80, storage: 90 },
  s10: "s10d",
  s12: ["s12b"],
  b2a: "b2a-br",
  b2b: "b2b-lg",
  b2c: "b2c-em",
  b2d: "b2d-lg",
  b2e: "b2e-hi",
  b2f: "b2f-conv",
  b1: { path: "know", amount: 12000, strictness: "flexible" },
  r10: ["r10-bed", "r10-dresser"],
};

/** Fixture C — organic lean + thrifty studio budget. */
const FIXTURE_C: QuizAnswers = {
  s1: ["s1a", "s1e"],
  s2: ["s2-cozy", "s2-natural", "s2-soft", "s2-sanctuary"],
  s3: ["s3c"],
  s4: { p3: "left", p4: "left", p6: "left", p7: "right" },
  s5: "s5-earth",
  s6: ["s6-li", "s6-ra", "s6-bo"],
  s7: { lighting: 55, storage: 40 },
  s10: "s10a",
  s12: ["s12c"],
  b2a: "b2a-st",
  b2b: "b2b-sm",
  b2c: "b2c-fw",
  b2d: "b2d-sh",
  b2e: "b2e-bud",
  b2f: "b2f-hunt",
  b1: { path: "guided" },
  r10: ["r10-plants", "r10-rug", "r10-armchair"],
};

const FIXTURES = {
  fixtureA: FIXTURE_A,
  fixtureB: FIXTURE_B,
  fixtureC: FIXTURE_C,
} as const;

describe("quiz scoring snapshots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T15:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  for (const [name, answers] of Object.entries(FIXTURES)) {
    it(`${name}: calculateTally / rankTally / computeBudgetRange / assembleQuizResultV1`, () => {
      const tally = calculateTally(answers);
      const ranked = rankTally(tally);
      const budgetRange = computeBudgetRange(
        answers.b2a as string,
        answers.b2b as string,
        answers.b2c as string,
        answers.b2d as string,
        answers.b2e as string,
        answers.b2f as string,
      );
      const assembled = assembleQuizResultV1({
        mode: "full",
        tally,
        answers,
        budgetRange,
      });

      expect({ tally, ranked, budgetRange, assembled }).toMatchSnapshot();
    });
  }
});
