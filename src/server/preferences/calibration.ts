/**
 * Preference proposal calibration report (acceptance rate by confidence band).
 * Re-derived from legacy calibration helpers; uses PreferenceProposal + ImplicitSignal.
 */

import { prisma } from "@/server/db";
import type { ChatPreferenceCategory } from "./preference-types";

type CalibrationBand = "<0.5" | "0.5-0.7" | "0.7-0.85" | ">=0.85";

type CalibrationRow = {
  category: ChatPreferenceCategory;
  confidence: number;
  accepted: boolean;
  resolvedAt: Date;
};

type CalibrationReportEntry = {
  category: ChatPreferenceCategory;
  band: CalibrationBand;
  total: number;
  accepted: number;
  acceptanceRate: number;
  restatePendingProposalCount: number;
};

export function confidenceBand(confidence: number): CalibrationBand {
  if (confidence < 0.5) return "<0.5";
  if (confidence < 0.7) return "0.5-0.7";
  if (confidence < 0.85) return "0.7-0.85";
  return ">=0.85";
}

const BANDS: CalibrationBand[] = ["<0.5", "0.5-0.7", "0.7-0.85", ">=0.85"];

export function computeCalibrationReport(input: {
  since: Date;
  rows: CalibrationRow[];
  restatePendingByCategory?: Partial<Record<ChatPreferenceCategory, number>>;
}): CalibrationReportEntry[] {
  const grouped = new Map<
    string,
    {
      total: number;
      accepted: number;
      category: ChatPreferenceCategory;
      band: CalibrationBand;
    }
  >();

  for (const row of input.rows) {
    if (row.resolvedAt < input.since) continue;
    const band = confidenceBand(row.confidence);
    const key = `${row.category}:${band}`;
    const current = grouped.get(key) ?? {
      total: 0,
      accepted: 0,
      category: row.category,
      band,
    };
    current.total += 1;
    if (row.accepted) current.accepted += 1;
    grouped.set(key, current);
  }

  const report: CalibrationReportEntry[] = [];
  for (const entry of grouped.values()) {
    report.push({
      category: entry.category,
      band: entry.band,
      total: entry.total,
      accepted: entry.accepted,
      acceptanceRate: entry.total > 0 ? entry.accepted / entry.total : 0,
      restatePendingProposalCount:
        input.restatePendingByCategory?.[entry.category] ?? 0,
    });
  }

  report.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return BANDS.indexOf(a.band) - BANDS.indexOf(b.band);
  });

  return report;
}

export async function loadCalibrationRows(
  userId: string,
  since: Date,
): Promise<CalibrationRow[]> {
  const rows = await prisma.preferenceProposal.findMany({
    where: {
      userId,
      status: { in: ["accepted", "rejected"] },
      resolvedAt: { gte: since },
    },
    select: {
      category: true,
      confidence: true,
      status: true,
      resolvedAt: true,
    },
    orderBy: { resolvedAt: "asc" },
  });

  return rows
    .filter(
      (row): row is typeof row & { resolvedAt: Date } => row.resolvedAt != null,
    )
    .map((row) => ({
      category: row.category as ChatPreferenceCategory,
      confidence: row.confidence,
      accepted: row.status === "accepted",
      resolvedAt: row.resolvedAt,
    }));
}

export async function loadRestatePendingCounts(
  userId: string,
  since: Date,
): Promise<Partial<Record<ChatPreferenceCategory, number>>> {
  const rows = await prisma.implicitSignal.groupBy({
    by: ["category"],
    where: {
      userId,
      type: "restate_pending_proposal",
      createdAt: { gte: since },
      category: { not: null },
    },
    _count: { _all: true },
  });

  const out: Partial<Record<ChatPreferenceCategory, number>> = {};
  for (const row of rows) {
    if (!row.category) continue;
    out[row.category as ChatPreferenceCategory] = row._count._all;
  }
  return out;
}

/** Weekly-style ops line — counts and rates only (never values or message text). */
export function logCalibrationRollup(report: CalibrationReportEntry[]): void {
  const total = report.reduce((sum, entry) => sum + entry.total, 0);
  const accepted = report.reduce((sum, entry) => sum + entry.accepted, 0);
  const restatePending = report.reduce(
    (sum, entry) => sum + entry.restatePendingProposalCount,
    0,
  );
  console.info(
    `[ops] calibration_rollup bands=${report.length} total=${total} accepted=${accepted} rate=${
      total > 0 ? (accepted / total).toFixed(3) : "0"
    } restate_pending=${restatePending}`,
  );
}
