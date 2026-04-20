import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkCostLimit,
  checkGlobalDailyCostLimit,
} from "@/lib/eva/core/cost-tracker";
import { getSessionCost, getDailyGlobalCost } from "@/lib/eva/core/cost-logger";
import { getDomainConfig } from "@/lib/eva/domain/config";

vi.mock("@/lib/eva/domain/config", () => ({
  getDomainConfig: vi.fn(),
}));

vi.mock("@/lib/eva/core/cost-logger", () => ({
  getSessionCost: vi.fn(),
  getDailyGlobalCost: vi.fn(),
  recordCost: vi.fn(),
}));

describe("cost-tracker", () => {
  beforeEach(() => {
    vi.mocked(getSessionCost).mockReset();
    vi.mocked(getDailyGlobalCost).mockReset();
    vi.mocked(getDomainConfig).mockReturnValue({
      name: "test",
      system_prompt: "",
      fields: [],
      rate_limits: {
        requests_per_minute: 30,
        session_cost_limit_usd: 2.0,
        global_daily_cost_limit_usd: 100,
      },
    });
  });

  it("allows when current cost below limit", async () => {
    vi.mocked(getSessionCost).mockResolvedValue(0.5);
    const r = await checkCostLimit("convo-1");
    expect(r.allowed).toBe(true);
    expect(r.currentCost).toBe(0.5);
    expect(r.limit).toBe(2);
  });

  it("blocks when current cost at or above limit", async () => {
    vi.mocked(getSessionCost).mockResolvedValue(2.0);
    const r = await checkCostLimit("convo-2");
    expect(r.allowed).toBe(false);
    expect(r.currentCost).toBe(2);
    expect(r.limit).toBe(2);
  });

  it("blocks when cost over limit", async () => {
    vi.mocked(getSessionCost).mockResolvedValue(3.5);
    const r = await checkCostLimit("convo-3");
    expect(r.allowed).toBe(false);
    expect(r.currentCost).toBe(3.5);
  });

  describe("checkGlobalDailyCostLimit", () => {
    it("allows when under global cap", async () => {
      vi.mocked(getDailyGlobalCost).mockResolvedValue(50);
      const r = await checkGlobalDailyCostLimit();
      expect(r.allowed).toBe(true);
      expect(r.limit).toBe(100);
    });

    it("blocks when at or over global cap", async () => {
      vi.mocked(getDailyGlobalCost).mockResolvedValue(100);
      const r = await checkGlobalDailyCostLimit();
      expect(r.allowed).toBe(false);
    });

    it("skips cap when global_daily_cost_limit_usd is 0", async () => {
      vi.mocked(getDomainConfig).mockReturnValue({
        name: "test",
        system_prompt: "",
        fields: [],
        rate_limits: {
          requests_per_minute: 30,
          session_cost_limit_usd: 2,
          global_daily_cost_limit_usd: 0,
        },
      });
      vi.mocked(getDailyGlobalCost).mockResolvedValue(999);
      const r = await checkGlobalDailyCostLimit();
      expect(r.allowed).toBe(true);
      expect(r.limit).toBe(0);
    });
  });
});
