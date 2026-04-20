import { prisma } from "@/lib/eva/db";
import { getOpenAIKey } from "@/lib/eva/core/openai";
import type { EvaHealthResponse } from "@/lib/eva/eva-health-types";

/** Shared by `/api/health`, `computeEvaHealth`, and probes — one `SELECT 1` path. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Eva stack readiness snapshot (DB + LLM env). Safe to call from Route Handlers or `instrumentation`.
 */
export async function computeEvaHealth(): Promise<EvaHealthResponse> {
  const isDev = process.env.NODE_ENV === "development";

  const database: "up" | "error" = (await isDatabaseReachable())
    ? "up"
    : "error";

  const llmConfigured = Boolean(getOpenAIKey());
  const llm: "configured" | "missing" = llmConfigured
    ? "configured"
    : "missing";

  const ok = database === "up" && llm === "configured";

  const hints: string[] = [];
  if (isDev) {
    if (database === "error") {
      hints.push(
        "Database: set DATABASE_URL in .env.local (postgresql://…), then npm run db:migrate:deploy",
      );
    }
    if (llm === "missing") {
      hints.push(
        "LLM: set OPENAI_API_KEY or OPENROUTER_API_KEY in .env.local (server-only)",
      );
    }
  }

  return {
    ok,
    database,
    llm,
    ...(isDev && hints.length > 0 ? { hints } : {}),
  };
}

/**
 * Log once to the **terminal** running `next dev` when Eva is not fully configured.
 * No UI; development only.
 */
export async function logEvaDevHealthToConsoleIfNeeded(): Promise<void> {
  if (process.env.NODE_ENV !== "development") return;

  const health = await computeEvaHealth();
  if (health.ok || !health.hints?.length) return;

  console.warn(
    "[eva] Dev environment not ready — Eva/chat will fail until fixed:\n\n" +
      health.hints.map((h) => `  • ${h}`).join("\n") +
      "\n",
  );
}
