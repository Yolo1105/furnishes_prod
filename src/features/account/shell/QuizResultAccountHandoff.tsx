"use client";

import { useEffect, useRef, useState } from "react";
import {
  QUIZ_RESULT_STORAGE_KEY,
  quizResultV1Schema,
} from "@/lib/contracts/quiz-result";
import { accountRequest } from "@/features/account/account-api";

/**
 * On first account shell mount, ingest a public-quiz result stashed in sessionStorage.
 */
export function QuizResultAccountHandoff() {
  const ran = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(QUIZ_RESULT_STORAGE_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      try {
        sessionStorage.removeItem(QUIZ_RESULT_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    const parsed = quizResultV1Schema.safeParse(parsedJson);
    if (!parsed.success) {
      try {
        sessionStorage.removeItem(QUIZ_RESULT_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    void accountRequest<{ created: number }>("/api/account/quiz-results", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    })
      .then((result) => {
        try {
          sessionStorage.removeItem(QUIZ_RESULT_STORAGE_KEY);
        } catch {
          // ignore
        }
        setToast(
          result.created > 0
            ? "Quiz style saved — review proposals in chat"
            : "Quiz already reflected in your preferences",
        );
      })
      .catch(() => {
        // Keep storage so a later visit can retry (unless gone/expired — server clears via 410).
      });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="wf-toast show" role="status">
      {toast}
    </div>
  );
}
