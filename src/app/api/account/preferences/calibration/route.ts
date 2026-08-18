import {
  computeCalibrationReport,
  loadCalibrationRows,
  loadRestatePendingCounts,
} from "@/server/preferences/calibration";
import { jsonOk, requireApiSession } from "@/server/http";

const DEFAULT_SINCE_DAYS = 90;

function parseSinceParam(value: string | null): Date {
  if (value?.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - DEFAULT_SINCE_DAYS);
  return since;
}

export async function GET(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const since = parseSinceParam(new URL(request.url).searchParams.get("since"));
  const [rows, restatePendingByCategory] = await Promise.all([
    loadCalibrationRows(session.user.id, since),
    loadRestatePendingCounts(session.user.id, since),
  ]);
  const report = computeCalibrationReport({
    since,
    rows,
    restatePendingByCategory,
  });

  return jsonOk({ report: report.length > 0 ? report : [] });
}
