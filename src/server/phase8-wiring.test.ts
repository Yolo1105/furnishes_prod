import { describe, expect, it } from "vitest";
import {
  buildHistoryWindow,
  formatContextSummaryPromptBlock,
  maybeRefreshContextSummary,
  shouldRefreshContextSummary,
} from "@/server/conversations/chat-context-summary";
import {
  buildProjectMemoryContext,
  isChatProjectMemoryEnabled,
} from "@/server/projects/project-memory";
import { formatProjectMemoryPrompt } from "@/server/projects/project-memory-prompt";
import {
  detectImplicitSignals,
  isChatImplicitSignalsEnabled,
  persistImplicitSignals,
} from "@/server/preferences/implicit-signals";
import {
  computeCalibrationReport,
  loadCalibrationRows,
  loadRestatePendingCounts,
  logCalibrationRollup,
} from "@/server/preferences/calibration";

/** Ensures Phase 8 B–E wiring exports stay reachable. */
describe("Phase 8 wiring surface", () => {
  it("exports chat context summary helpers", () => {
    expect(typeof shouldRefreshContextSummary).toBe("function");
    expect(typeof buildHistoryWindow).toBe("function");
    expect(typeof formatContextSummaryPromptBlock).toBe("function");
    expect(typeof maybeRefreshContextSummary).toBe("function");
  });

  it("exports project memory helpers", () => {
    expect(typeof buildProjectMemoryContext).toBe("function");
    expect(typeof formatProjectMemoryPrompt).toBe("function");
    expect(typeof isChatProjectMemoryEnabled).toBe("function");
  });

  it("exports implicit signal helpers", () => {
    expect(typeof detectImplicitSignals).toBe("function");
    expect(typeof persistImplicitSignals).toBe("function");
    expect(typeof isChatImplicitSignalsEnabled).toBe("function");
  });

  it("exports calibration helpers", () => {
    expect(typeof computeCalibrationReport).toBe("function");
    expect(typeof loadCalibrationRows).toBe("function");
    expect(typeof loadRestatePendingCounts).toBe("function");
    expect(typeof logCalibrationRollup).toBe("function");
  });
});
