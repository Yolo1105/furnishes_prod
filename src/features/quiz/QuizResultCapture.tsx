"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  QUIZ_RESULT_STORAGE_KEY,
  quizResultV1Schema,
  type QuizResultV1,
} from "@/lib/contracts/quiz-result";
import { routes } from "@/lib/contracts";
import { accountRequest } from "@/features/account/account-api";

type IngestResponse = {
  created: number;
  skipped: number;
  categories: string[];
};

async function postQuizResult(
  result: QuizResultV1 | ReturnType<typeof quizResultV1Schema.parse>,
): Promise<IngestResponse> {
  return accountRequest<IngestResponse>("/api/account/quiz-results", {
    method: "POST",
    body: JSON.stringify(result),
  });
}

function storePublicResult(
  result: QuizResultV1 | ReturnType<typeof quizResultV1Schema.parse>,
) {
  try {
    sessionStorage.setItem(QUIZ_RESULT_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // private mode / quota — ignore
  }
}

/**
 * Listens for quiz completion events on /quiz.
 * Signed-in: POST ingest. Signed-out: sessionStorage for post-auth handoff.
 */
export function QuizResultCapture({ children }: { children: ReactNode }) {
  const [banner, setBanner] = useState<string | null>(null);
  const handledAt = useRef<string | null>(null);

  useEffect(() => {
    async function onComplete(event: Event) {
      const detail = (event as CustomEvent<QuizResultV1>).detail;
      const parsed = quizResultV1Schema.safeParse(detail);
      if (!parsed.success) return;
      if (handledAt.current === parsed.data.completedAt) return;
      handledAt.current = parsed.data.completedAt;

      try {
        const ingested = await postQuizResult(parsed.data);
        try {
          sessionStorage.removeItem(QUIZ_RESULT_STORAGE_KEY);
        } catch {
          // ignore
        }
        setBanner(
          ingested.created > 0
            ? "Saved — review your style proposals"
            : "Quiz reviewed — no new proposals to save",
        );
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code: string }).code)
            : "";
        if (code === "unauthorized") {
          storePublicResult(parsed.data);
          setBanner("Create an account to save your style");
          return;
        }
        storePublicResult(parsed.data);
        setBanner("Could not save right now — sign in to retry");
      }
    }

    window.addEventListener("furnishes:quiz-complete", onComplete);
    return () =>
      window.removeEventListener("furnishes:quiz-complete", onComplete);
  }, []);

  return (
    <>
      {children}
      {banner ? (
        <div className="quiz-save-banner" role="status">
          <span>{banner}</span>
          {banner.startsWith("Saved") || banner.startsWith("Quiz reviewed") ? (
            <Link href={routes.accountChat}>Open chat</Link>
          ) : banner.includes("account") || banner.includes("sign in") ? (
            <Link href={routes.signup}>Create account</Link>
          ) : null}
        </div>
      ) : null}
      <style>{`
        .quiz-save-banner {
          position: fixed;
          left: 50%;
          bottom: 28px;
          transform: translateX(-50%);
          z-index: 80;
          display: flex;
          gap: 16px;
          align-items: center;
          padding: 14px 18px;
          background: #1a1714;
          color: #ddd5c4;
          border: 1px solid rgba(221, 213, 196, 0.25);
          font: 600 12px/1.3 "Space Mono", ui-monospace, monospace;
          letter-spacing: 0.04em;
        }
        .quiz-save-banner a {
          color: #b33d0e;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </>
  );
}
