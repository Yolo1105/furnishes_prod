import { NextResponse } from "next/server";
import { buildLiveness, buildReadiness } from "@/server/ops/health";
import { logOps, requestIdFromHeaders } from "@/server/ops/log";

export const dynamic = "force-dynamic";

/**
 * Liveness: always 200 when the process can serve HTTP.
 * Readiness: `GET /api/health?ready=1` — 200 only when the database answers.
 */
export async function GET(request: Request) {
  const ready = new URL(request.url).searchParams.get("ready") === "1";
  const requestId = requestIdFromHeaders(request.headers);

  if (!ready) {
    return NextResponse.json(buildLiveness(), {
      headers: { "x-request-id": requestId },
    });
  }

  const body = await buildReadiness();
  if (!body.ready) {
    logOps("error", "health_not_ready", {
      requestId,
      database: body.checks.database,
    });
    return NextResponse.json(body, {
      status: 503,
      headers: { "x-request-id": requestId },
    });
  }

  return NextResponse.json(body, {
    headers: { "x-request-id": requestId },
  });
}
