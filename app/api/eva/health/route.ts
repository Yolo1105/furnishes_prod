import { NextResponse, type NextRequest } from "next/server";

import { computeEvaHealth } from "@/lib/eva/eva-health-check";

export const dynamic = "force-dynamic";

export type { EvaHealthResponse } from "@/lib/eva/eva-health-types";

/**
 * Eva stack readiness: Prisma/DB + LLM API key.
 *
 * - **Default:** HTTP **200** always — use JSON `ok` (avoids browser “failed to load” noise on 503).
 * - **`?strict=1`:** HTTP **503** when unhealthy (for probes that require status codes).
 * Startup hints log once in dev via `instrumentation.ts` → `logEvaDevHealthToConsoleIfNeeded`.
 */
export async function GET(req: NextRequest) {
  const body = await computeEvaHealth();
  const strict = req.nextUrl.searchParams.get("strict") === "1";
  const status = !body.ok && strict ? 503 : 200;
  return NextResponse.json(body, { status });
}
