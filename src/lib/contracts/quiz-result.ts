import { z } from "zod";

/**
 * Versioned Design Quiz completion payload.
 * Assembled client-side from quiz tally/answers; ingested as pending proposals.
 */
export type QuizResultV1 = {
  version: 1;
  completedAt: string;
  answers: {
    style: { primary: string; secondary: string[] };
    palette: { colors: string[]; avoid: string[] };
    roomFocus: string | null;
    budgetBand: string | null;
    lifestyle: string[];
    furniture: string[];
  };
  rawScores?: Record<string, number> | undefined;
};

export const quizResultV1Schema = z.object({
  version: z.literal(1),
  completedAt: z.string().datetime({ offset: true }),
  answers: z.object({
    style: z.object({
      primary: z.string().trim().min(1).max(80),
      secondary: z.array(z.string().trim().min(1).max(80)).max(8),
    }),
    palette: z.object({
      colors: z.array(z.string().trim().min(1).max(80)).max(12),
      avoid: z.array(z.string().trim().min(1).max(80)).max(12),
    }),
    roomFocus: z.string().trim().min(1).max(80).nullable(),
    budgetBand: z.string().trim().min(1).max(80).nullable(),
    lifestyle: z.array(z.string().trim().min(1).max(80)).max(16),
    furniture: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
  }),
  rawScores: z.record(z.string(), z.number()).optional(),
});

export type QuizResultV1Parsed = z.infer<typeof quizResultV1Schema>;

export const QUIZ_RESULT_STORAGE_KEY = "furnishes.quizResult.v1"; // gitleaks:allow sessionStorage name, not a secret
export const QUIZ_RESULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
