import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertSeedReadinessProductionGuards,
  isDeployedProductionRuntime,
} from "@/lib/env/production-guards";

describe("production-guards", () => {
  const env = process.env;

  beforeEach(() => {
    delete env.VERCEL_ENV;
    delete env.DEPLOYMENT_ENV;
    delete env.ALLOW_TEST_HELPERS;
    delete env.ALLOW_MOCK_AUTH;
  });

  afterEach(() => {
    delete env.VERCEL_ENV;
    delete env.DEPLOYMENT_ENV;
    delete env.ALLOW_TEST_HELPERS;
    delete env.ALLOW_MOCK_AUTH;
  });

  it("isDeployedProductionRuntime is true only for production deploy markers", () => {
    expect(isDeployedProductionRuntime()).toBe(false);
    env.VERCEL_ENV = "preview";
    expect(isDeployedProductionRuntime()).toBe(false);
    env.VERCEL_ENV = "production";
    expect(isDeployedProductionRuntime()).toBe(true);
    delete env.VERCEL_ENV;
    env.DEPLOYMENT_ENV = "production";
    expect(isDeployedProductionRuntime()).toBe(true);
  });

  it("assertSeedReadinessProductionGuards no-ops when not deployed production", () => {
    env.ALLOW_TEST_HELPERS = "1";
    expect(() => assertSeedReadinessProductionGuards()).not.toThrow();
  });

  it("throws when ALLOW_TEST_HELPERS on production deploy", () => {
    env.VERCEL_ENV = "production";
    env.ALLOW_TEST_HELPERS = "1";
    expect(() => assertSeedReadinessProductionGuards()).toThrow(
      /ALLOW_TEST_HELPERS/,
    );
  });

  it("throws when ALLOW_MOCK_AUTH on production deploy", () => {
    env.VERCEL_ENV = "production";
    env.ALLOW_MOCK_AUTH = "1";
    expect(() => assertSeedReadinessProductionGuards()).toThrow(
      /ALLOW_MOCK_AUTH/,
    );
  });
});
