import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authForgotMaxAttempts,
  authLoginMaxAttempts,
  authRateLimitWindowMs,
} from "./rate-limit";
import {
  authRateLimitRetentionDays,
  securityEventRetentionDays,
} from "./retention";

function clearAuthRateLimitEnv() {
  delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
  delete process.env.AUTH_LOGIN_MAX_ATTEMPTS;
  delete process.env.AUTH_FORGOT_MAX_ATTEMPTS;
  delete process.env.SECURITY_EVENT_RETENTION_DAYS;
  delete process.env.AUTH_RATE_LIMIT_RETENTION_DAYS;
}

beforeEach(clearAuthRateLimitEnv);
afterEach(clearAuthRateLimitEnv);

describe("auth rate-limit env knobs", () => {
  it("uses tighter login/forgot defaults", () => {
    expect(authLoginMaxAttempts()).toBe(10);
    expect(authForgotMaxAttempts()).toBe(5);
    expect(authRateLimitWindowMs()).toBe(15 * 60 * 1000);
  });

  it("reads overrides", () => {
    process.env.AUTH_LOGIN_MAX_ATTEMPTS = "3";
    process.env.AUTH_FORGOT_MAX_ATTEMPTS = "2";
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";
    expect(authLoginMaxAttempts()).toBe(3);
    expect(authForgotMaxAttempts()).toBe(2);
    expect(authRateLimitWindowMs()).toBe(60_000);
  });
});

describe("auth retention env knobs", () => {
  it("defaults to 90 / 7 days", () => {
    expect(securityEventRetentionDays()).toBe(90);
    expect(authRateLimitRetentionDays()).toBe(7);
  });

  it("reads overrides", () => {
    process.env.SECURITY_EVENT_RETENTION_DAYS = "30";
    process.env.AUTH_RATE_LIMIT_RETENTION_DAYS = "1";
    expect(securityEventRetentionDays()).toBe(30);
    expect(authRateLimitRetentionDays()).toBe(1);
  });
});
