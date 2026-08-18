import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkCostAllowance,
  logDailyCostRollup,
  startOfUtcDay,
  type CostGuardDeps,
} from "./cost-guard";

describe("cost-guard", () => {
  afterEach(() => {
    delete process.env.CHAT_SESSION_COST_LIMIT_USD;
    delete process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD;
    delete process.env.CHAT_USER_DAILY_COST_LIMIT_USD;
    delete process.env.CHAT_USER_DAILY_COST_USD;
  });

  function deps(partial: Partial<CostGuardDeps>): CostGuardDeps {
    return {
      getSessionCostUsd: vi.fn().mockResolvedValue(0),
      getDailyUserCostUsd: vi.fn().mockResolvedValue(0),
      getDailyGlobalCostUsd: vi.fn().mockResolvedValue(0),
      ...partial,
    };
  }

  it("allows when current session cost is below limit", async () => {
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "100";
    const result = await checkCostAllowance(
      { userId: "u1", conversationId: "c1" },
      deps({ getSessionCostUsd: async () => 0.5 }),
    );
    expect(result.allowed).toBe(true);
    expect(result.sessionCostUsd).toBe(0.5);
    expect(result.sessionLimitUsd).toBe(2);
    expect(result.warning).toBe(false);
  });

  it("blocks when session cost is at or above limit", async () => {
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    const atLimit = await checkCostAllowance(
      { userId: "u1", conversationId: "c2" },
      deps({ getSessionCostUsd: async () => 2.0 }),
    );
    expect(atLimit.allowed).toBe(false);
    expect(atLimit.warning).toBe(true);

    const over = await checkCostAllowance(
      { userId: "u1", conversationId: "c3" },
      deps({ getSessionCostUsd: async () => 3.5 }),
    );
    expect(over.allowed).toBe(false);
  });

  it("warns at 80% of session limit while still allowing", async () => {
    process.env.CHAT_SESSION_COST_LIMIT_USD = "2";
    const result = await checkCostAllowance(
      { userId: "u1", conversationId: "c4" },
      deps({ getSessionCostUsd: async () => 1.6 }),
    );
    expect(result.allowed).toBe(true);
    expect(result.warning).toBe(true);
  });

  describe("per-user daily cap", () => {
    it("blocks when user daily CostLog spend is at limit", async () => {
      process.env.CHAT_USER_DAILY_COST_LIMIT_USD = "5";
      process.env.CHAT_SESSION_COST_LIMIT_USD = "0";
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
      const result = await checkCostAllowance(
        { userId: "u1", conversationId: "c1" },
        deps({ getDailyUserCostUsd: async () => 5 }),
      );
      expect(result.allowed).toBe(false);
      expect(result.userCostUsd).toBe(5);
      expect(result.userLimitUsd).toBe(5);
    });

    it("honors legacy CHAT_USER_DAILY_COST_USD alias", async () => {
      process.env.CHAT_USER_DAILY_COST_USD = "3";
      process.env.CHAT_SESSION_COST_LIMIT_USD = "0";
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
      const result = await checkCostAllowance(
        { userId: "u1" },
        deps({ getDailyUserCostUsd: async () => 3 }),
      );
      expect(result.allowed).toBe(false);
      expect(result.userLimitUsd).toBe(3);
    });

    it("prefers CHAT_USER_DAILY_COST_LIMIT_USD over alias", async () => {
      process.env.CHAT_USER_DAILY_COST_LIMIT_USD = "8";
      process.env.CHAT_USER_DAILY_COST_USD = "3";
      process.env.CHAT_SESSION_COST_LIMIT_USD = "0";
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
      const result = await checkCostAllowance(
        { userId: "u1" },
        deps({ getDailyUserCostUsd: async () => 5 }),
      );
      expect(result.allowed).toBe(true);
      expect(result.userLimitUsd).toBe(8);
    });

    it("skips user cap when limit is 0", async () => {
      process.env.CHAT_USER_DAILY_COST_LIMIT_USD = "0";
      process.env.CHAT_SESSION_COST_LIMIT_USD = "0";
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
      const result = await checkCostAllowance(
        { userId: "u1" },
        deps({ getDailyUserCostUsd: async () => 999 }),
      );
      expect(result.allowed).toBe(true);
      expect(result.userLimitUsd).toBe(0);
    });
  });

  describe("global daily cap", () => {
    it("allows when under global cap", async () => {
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "100";
      const result = await checkCostAllowance(
        { userId: "u1", conversationId: "c1" },
        deps({ getDailyGlobalCostUsd: async () => 50 }),
      );
      expect(result.allowed).toBe(true);
      expect(result.globalLimitUsd).toBe(100);
    });

    it("blocks when at or over global cap", async () => {
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "100";
      const result = await checkCostAllowance(
        { userId: "u1", conversationId: "c1" },
        deps({ getDailyGlobalCostUsd: async () => 100 }),
      );
      expect(result.allowed).toBe(false);
    });

    it("skips global cap when CHAT_GLOBAL_DAILY_COST_LIMIT_USD is 0", async () => {
      process.env.CHAT_GLOBAL_DAILY_COST_LIMIT_USD = "0";
      const result = await checkCostAllowance(
        { userId: "u1", conversationId: "c1" },
        deps({ getDailyGlobalCostUsd: async () => 999 }),
      );
      expect(result.allowed).toBe(true);
      expect(result.globalLimitUsd).toBe(0);
    });
  });

  it("computes UTC day boundary at midnight", () => {
    const noon = new Date(Date.UTC(2026, 7, 3, 12, 30, 0));
    const start = startOfUtcDay(noon);
    expect(start.toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });

  it("logs a daily cost rollup event without message content", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const rollup = await logDailyCostRollup(
      new Date(Date.UTC(2026, 7, 3, 15, 0, 0)),
      {
        getDailyGlobalCostUsd: async () => 12.5,
        getDailyCostByKind: async () => ({
          chat: 10,
          brief: 2,
          image: 0.5,
        }),
      },
    );
    expect(rollup.dayStartIso).toBe("2026-08-03T00:00:00.000Z");
    expect(rollup.costUsd).toBe(12.5);
    expect(rollup.costByKind).toEqual({ chat: 10, brief: 2, image: 0.5 });
    expect(spy).toHaveBeenCalled();
    const logged = String(spy.mock.calls[0]?.[0] ?? "");
    expect(logged).toContain("[ops]");
    expect(logged).toContain("cost_daily_rollup");
    expect(logged).toContain("12.5");
    expect(logged).toContain("costByKindJson");
    expect(logged).not.toMatch(/message|content|transcript/i);
    spy.mockRestore();
  });
});
