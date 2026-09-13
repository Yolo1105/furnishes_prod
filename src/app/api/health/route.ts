import { NextResponse } from "next/server";
import { requestIdFromHeaders } from "@/server/ops/log";

export const dynamic = "force-dynamic";

/**
 * Liveness: always 200 when the process can serve HTTP.
 * Readiness: `GET /api/health?ready=1` — 200 only when the database answers.
 * Liveness must not import Prisma; a missing query engine would 500 the probe.
 */
export async function GET(request: Request) {
  const ready = new URL(request.url).searchParams.get("ready") === "1";
  const requestId = requestIdFromHeaders(request.headers);

  if (!ready) {
    return NextResponse.json(
      { status: "ok", application: "web" },
      { headers: { "x-request-id": requestId } },
    );
  }

  const { buildReadiness } = await import("@/server/ops/health");
  const { logOps } = await import("@/server/ops/log");
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
