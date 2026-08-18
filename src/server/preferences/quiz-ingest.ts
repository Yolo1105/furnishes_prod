import {
  QUIZ_RESULT_MAX_AGE_MS,
  type QuizResultV1Parsed,
} from "@/lib/contracts/quiz-result";
import { prisma } from "@/server/db";
import { err, ok, type ServiceResult } from "@/server/result";
import { normalizePreferenceValue } from "./preference-normalization";
import {
  CHAT_PREFERENCE_CATEGORIES,
  emptyPreferenceMap,
  isChatPreferenceCategory,
  type ChatPreferenceCategory,
  type ExtractedPreferenceCandidate,
} from "./preference-types";

type QuizIngestCandidate = ExtractedPreferenceCandidate & {
  category: ChatPreferenceCategory;
};

/**
 * Map a validated quiz result into preference candidates.
 * Avoid/exclusion: mirror chat extraction — drop matching positives, never
 * invent an exclusion category (frontend has none).
 */
export function mapQuizResultToCandidates(
  result: QuizResultV1Parsed,
): QuizIngestCandidate[] {
  const avoid = new Set(
    result.answers.palette.avoid
      .map((value) => normalizePreferenceValue("color", value))
      .filter((value): value is string => Boolean(value)),
  );

  const out: QuizIngestCandidate[] = [];

  const primary = normalizePreferenceValue(
    "style",
    result.answers.style.primary,
  );
  if (primary) {
    out.push({ category: "style", value: primary, confidence: 0.85 });
  }
  for (const secondary of result.answers.style.secondary) {
    const value = normalizePreferenceValue("style", secondary);
    if (!value || value === primary) continue;
    out.push({ category: "style", value, confidence: 0.6 });
  }

  for (const color of result.answers.palette.colors) {
    const value = normalizePreferenceValue("color", color);
    if (!value) continue;
    if (avoid.has(value)) continue;
    out.push({ category: "color", value, confidence: 0.7 });
  }

  if (result.answers.roomFocus) {
    const value = normalizePreferenceValue("room", result.answers.roomFocus);
    if (value) {
      out.push({ category: "room", value, confidence: 0.8 });
    }
  }

  if (result.answers.budgetBand) {
    const value = normalizePreferenceValue("budget", result.answers.budgetBand);
    if (value) {
      out.push({ category: "budget", value, confidence: 0.7 });
    }
  }

  for (const item of result.answers.furniture) {
    const value = normalizePreferenceValue("furniture", item);
    if (!value) continue;
    out.push({ category: "furniture", value, confidence: 0.65 });
  }

  // lifestyle tags are free-form; only keep ones that normalize as style extras
  // when they aren't already covered — drop unknown/generic.
  for (const tag of result.answers.lifestyle) {
    const asStyle = normalizePreferenceValue("style", tag);
    if (!asStyle) continue;
    if (out.some((row) => row.category === "style" && row.value === asStyle)) {
      continue;
    }
    // Keywords like "warmth" are usually too generic — normalize may keep them;
    // only accept if they look like known style aliases (already in STYLE_ALIASES).
    // Drop the rest rather than guessing furniture/color.
  }

  return out;
}

export function quizResultIsFresh(
  completedAt: string,
  now = Date.now(),
): boolean {
  const completed = Date.parse(completedAt);
  if (Number.isNaN(completed)) return false;
  return now - completed <= QUIZ_RESULT_MAX_AGE_MS;
}

type QuizIngestResult = {
  created: number;
  skipped: number;
  categories: ChatPreferenceCategory[];
};

export async function ingestQuizResult(input: {
  userId: string;
  result: QuizResultV1Parsed;
}): Promise<
  ServiceResult<
    QuizIngestResult,
    "forbidden" | "not_found" | "validation" | "gone"
  >
> {
  if (!quizResultIsFresh(input.result.completedAt)) {
    return err(
      "gone",
      "Quiz result expired. Retake the quiz to save preferences.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { memoryEnabled: true },
  });
  if (!user) return err("not_found", "User not found.");
  if (!user.memoryEnabled) {
    return err(
      "forbidden",
      "Memory is disabled. Enable Eva memory in Privacy to save quiz preferences.",
    );
  }

  const candidates = mapQuizResultToCandidates(input.result);
  if (candidates.length === 0) {
    return ok({ created: 0, skipped: 0, categories: [] });
  }

  const currentRows = await prisma.userPreference.findMany({
    where: { userId: input.userId },
    select: { category: true, value: true },
  });
  const current = emptyPreferenceMap();
  for (const row of currentRows) {
    if (!isChatPreferenceCategory(row.category)) continue;
    current[row.category] = row.value;
  }
  const pending = await prisma.preferenceProposal.findMany({
    where: { userId: input.userId, status: "pending" },
    select: { category: true, proposedValue: true },
  });

  const accepted: QuizIngestCandidate[] = [];
  let skipped = 0;

  for (const candidate of candidates) {
    const normalized = normalizePreferenceValue(
      candidate.category,
      candidate.value,
    );
    if (!normalized) {
      skipped += 1;
      continue;
    }
    const confirmed = current[candidate.category];
    if (
      confirmed &&
      normalizePreferenceValue(candidate.category, confirmed) === normalized
    ) {
      skipped += 1;
      continue;
    }
    const duplicatePending = pending.some(
      (row) =>
        row.category === candidate.category &&
        normalizePreferenceValue(candidate.category, row.proposedValue) ===
          normalized,
    );
    if (duplicatePending) {
      skipped += 1;
      continue;
    }
    if (
      accepted.some(
        (row) =>
          row.category === candidate.category && row.value === normalized,
      )
    ) {
      skipped += 1;
      continue;
    }
    accepted.push({ ...candidate, value: normalized });
  }

  if (accepted.length === 0) {
    return ok({ created: 0, skipped, categories: [] });
  }

  await prisma.$transaction(
    accepted.map((candidate) =>
      prisma.preferenceProposal.create({
        data: {
          userId: input.userId,
          conversationId: null,
          sourceMessageId: null,
          displayMessageId: null,
          source: "quiz",
          category: candidate.category,
          proposedValue: candidate.value,
          previousValue: current[candidate.category],
          confidence: candidate.confidence,
          status: "pending",
          evidenceText: "From your Design Quiz",
        },
      }),
    ),
  );

  const categories = CHAT_PREFERENCE_CATEGORIES.filter((category) =>
    accepted.some((row) => row.category === category),
  );

  return ok({ created: accepted.length, skipped, categories });
}
