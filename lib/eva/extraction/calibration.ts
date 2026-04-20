import { prisma } from "@/lib/eva/db";

const BUCKET_SIZE = 0.1;
const MIN_SAMPLES = 20;

/**
 * Log a calibration data point when user accepts or rejects a preference.
 */
export async function logCalibration(
  conversationId: string,
  field: string,
  predictedConfidence: number,
  accepted: boolean,
): Promise<void> {
  await prisma.calibrationLog.create({
    data: {
      conversationId,
      field,
      predictedConfidence,
      accepted,
    },
  });
}

function bucketKey(confidence: number): number {
  const b = Math.floor(confidence / BUCKET_SIZE) * BUCKET_SIZE;
  return Math.min(1, Math.max(0, b));
}

/**
 * Return calibrated confidence for a field: use actual acceptance rate for the
 * bucket matching rawConfidence when we have enough samples; otherwise return rawConfidence.
 */
export async function getCalibratedConfidence(
  field: string,
  rawConfidence: number,
): Promise<number> {
  const bucket = bucketKey(rawConfidence);
  const rows = await prisma.calibrationLog.findMany({
    where: { field },
    select: { predictedConfidence: true, accepted: true },
  });
  const inBucket = rows.filter(
    (r) => bucketKey(r.predictedConfidence) === bucket,
  );
  if (inBucket.length < MIN_SAMPLES) return rawConfidence;
  const acceptedCount = inBucket.filter((r) => r.accepted).length;
  return acceptedCount / inBucket.length;
}

/**
 * Per-field accuracy stats for admin dashboard.
 */
export async function getCalibrationReport(): Promise<
  Array<{ field: string; sampleCount: number; acceptanceRate: number }>
> {
  const rows = await prisma.calibrationLog.findMany({
    select: { field: true, accepted: true },
  });
  const byField: Record<string, { total: number; accepted: number }> = {};
  for (const r of rows) {
    if (!byField[r.field]) byField[r.field] = { total: 0, accepted: 0 };
    byField[r.field].total++;
    if (r.accepted) byField[r.field].accepted++;
  }
  return Object.entries(byField).map(([field, { total, accepted }]) => ({
    field,
    sampleCount: total,
    acceptanceRate: total > 0 ? accepted / total : 0,
  }));
}
