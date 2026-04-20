import { getOpenAIKey } from "@/lib/eva/core/openai";
import { isDatabaseReachable } from "@/lib/eva/eva-health-check";

export const dynamic = "force-dynamic";

const startTime = Date.now();

/**
 * Public health check — minimal surface (no internal failure details).
 * Load balancers should use `ok` + HTTP status only.
 * DB reachability uses the same `SELECT 1` path as `/api/eva/health` (`isDatabaseReachable`).
 */
export async function GET() {
  const databaseOk = await isDatabaseReachable();

  const llmConfigured = !!getOpenAIKey();
  let status: "ok" | "degraded" | "error";
  if (!databaseOk) {
    status = "error";
  } else if (!llmConfigured) {
    status = "degraded";
  } else {
    status = "ok";
  }

  const httpStatus = status === "error" ? 503 : 200;

  return Response.json(
    {
      ok: status !== "error",
      status,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    },
    { status: httpStatus },
  );
}
