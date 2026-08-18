import { describe, expect, it } from "vitest";
import { computeCalibrationReport, confidenceBand } from "./calibration";
import type { ChatPreferenceCategory } from "./preference-types";

type TestCalibrationRow = {
  category: ChatPreferenceCategory;
  confidence: number;
  accepted: boolean;
  resolvedAt: Date;
};

describe("confidenceBand", () => {
  it("maps confidence to the four bands", () => {
    expect(confidenceBand(0.4)).toBe("<0.5");
    expect(confidenceBand(0.55)).toBe("0.5-0.7");
    expect(confidenceBand(0.75)).toBe("0.7-0.85");
    expect(confidenceBand(0.9)).toBe(">=0.85");
  });
});

describe("computeCalibrationReport", () => {
  const since = new Date("2026-08-01T00:00:00.000Z");

  const rows: TestCalibrationRow[] = [
    {
      category: "style",
      confidence: 0.55,
      accepted: true,
      resolvedAt: new Date("2026-08-02T00:00:00.000Z"),
    },
    {
      category: "style",
      confidence: 0.6,
      accepted: false,
      resolvedAt: new Date("2026-08-03T00:00:00.000Z"),
    },
    {
      category: "color",
      confidence: 0.8,
      accepted: true,
      resolvedAt: new Date("2026-08-04T00:00:00.000Z"),
    },
    {
      category: "color",
      confidence: 0.82,
      accepted: true,
      resolvedAt: new Date("2026-07-20T00:00:00.000Z"),
    },
  ];

  it("computes acceptance rate per category and band", () => {
    const report = computeCalibrationReport({ since, rows });
    const styleBand = report.find(
      (entry) => entry.category === "style" && entry.band === "0.5-0.7",
    );
    expect(styleBand?.total).toBe(2);
    expect(styleBand?.accepted).toBe(1);
    expect(styleBand?.acceptanceRate).toBe(0.5);

    const colorBand = report.find(
      (entry) => entry.category === "color" && entry.band === "0.7-0.85",
    );
    expect(colorBand?.total).toBe(1);
    expect(colorBand?.accepted).toBe(1);
    expect(colorBand?.acceptanceRate).toBe(1);
  });

  it("includes restate_pending_proposal counts as trust column", () => {
    const report = computeCalibrationReport({
      since,
      rows,
      restatePendingByCategory: { style: 3, color: 1 },
    });
    expect(
      report.find((entry) => entry.category === "style")
        ?.restatePendingProposalCount,
    ).toBe(3);
    expect(
      report.find((entry) => entry.category === "color")
        ?.restatePendingProposalCount,
    ).toBe(1);
  });

  it("returns empty report when no rows match since", () => {
    const report = computeCalibrationReport({
      since: new Date("2026-09-01T00:00:00.000Z"),
      rows,
    });
    expect(report).toEqual([]);
  });
});
