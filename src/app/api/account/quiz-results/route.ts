import { consumeRateLimit } from "@/server/auth/rate-limit";
import {
  fromServiceResult,
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/server/http";
import { quizResultV1Schema } from "@/lib/contracts/quiz-result";
import { ingestQuizResult } from "@/server/preferences/quiz-ingest";

const QUIZ_INGEST_MAX_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const limit = await consumeRateLimit(
    `quiz_ingest:user:${session.user.id}`,
    QUIZ_INGEST_MAX_PER_DAY,
    DAY_MS,
  );
  if (!limit.allowed) {
    return jsonError(
      429,
      "rate_limited",
      "Quiz save limit reached. Try again tomorrow.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const parsed = quizResultV1Schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", "Invalid quiz result.", {
      body: parsed.error.issues[0]?.message ?? "Invalid quiz result.",
    });
  }

  const result = await ingestQuizResult({
    userId: session.user.id,
    result: parsed.data,
  });

  if (!result.ok && result.error === "gone") {
    return jsonError(
      410,
      "gone",
      result.message ??
        "Quiz result expired. Retake the quiz to save preferences.",
    );
  }

  if (!result.ok) {
    return fromServiceResult(result, {
      forbidden: 403,
      not_found: 404,
      validation: 400,
    });
  }

  return jsonOk(result.value);
}
