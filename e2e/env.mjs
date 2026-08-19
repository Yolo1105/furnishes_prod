/**
 * Shared E2E process env. Imported by `scripts/run-e2e.mjs` and
 * `playwright.config.ts` so local and CI cannot drift.
 */

export const E2E_PORT = 3100;

export const DEFAULT_E2E_DATABASE_URL =
  "postgresql://furnishes:furnishes@127.0.0.1:5433/furnishes_e2e?schema=public";

export const E2E_WEBHOOK_SECRET = "whsec_e2e_webhook_secret";

/**
 * Overlay for Playwright's webServer and the runner. Existing `from` values
 * win except for the hard E2E flags we always set.
 */
export function e2eEnv(from = process.env) {
  return {
    ...from,
    NEXT_PUBLIC_E2E: "1",
    NEXT_TELEMETRY_DISABLED: "1",
    // Cookie auth is the E2E/CI path. Empty strings beat .env.local Clerk keys
    // so `next build` cannot enable ClerkProvider and break session-cookie tests.
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
    CLERK_SECRET_KEY: "",
    DATABASE_URL: from.DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL,
    AUTH_SECRET: from.AUTH_SECRET ?? "e2e-auth-secret-phase2-32chars-min",
    APP_ORIGIN: from.APP_ORIGIN ?? `http://127.0.0.1:${E2E_PORT}`,
    AUTH_COOKIE_SECURE: "0",
    IMAGE_GENERATION_PROVIDER: from.IMAGE_GENERATION_PROVIDER ?? "test",
    IMAGE_GENERATION_DAILY_LIMIT: from.IMAGE_GENERATION_DAILY_LIMIT ?? "2000",
    IMAGE_GENERATION_MAX_CONCURRENT_PER_USER:
      from.IMAGE_GENERATION_MAX_CONCURRENT_PER_USER ?? "20",
    CHAT_PROVIDER: from.CHAT_PROVIDER ?? "local",
    PREFERENCE_EXTRACTION_PROVIDER:
      from.PREFERENCE_EXTRACTION_PROVIDER ?? "heuristic",
    CHAT_USER_MESSAGES_PER_MINUTE: from.CHAT_USER_MESSAGES_PER_MINUTE ?? "500",
    CHAT_USER_MESSAGES_PER_DAY: from.CHAT_USER_MESSAGES_PER_DAY ?? "5000",
    CHAT_EXTRACTION_PER_MINUTE: from.CHAT_EXTRACTION_PER_MINUTE ?? "500",
    CHAT_USER_DAILY_COST_LIMIT_USD: from.CHAT_USER_DAILY_COST_LIMIT_USD ?? "0",
    CHAT_GLOBAL_DAILY_COST_LIMIT_USD:
      from.CHAT_GLOBAL_DAILY_COST_LIMIT_USD ?? "0",
    AUTH_LOGIN_MAX_ATTEMPTS: from.AUTH_LOGIN_MAX_ATTEMPTS ?? "200",
    AUTH_SIGNUP_MAX_ATTEMPTS: from.AUTH_SIGNUP_MAX_ATTEMPTS ?? "200",
    AUTH_FORGOT_MAX_ATTEMPTS: from.AUTH_FORGOT_MAX_ATTEMPTS ?? "200",
    COMMERCE_ENABLED: from.COMMERCE_ENABLED ?? "1",
    COMMERCE_PAYMENT_PROVIDER: from.COMMERCE_PAYMENT_PROVIDER ?? "test",
    COMMERCE_SHIPPING_FLAT_CENTS: from.COMMERCE_SHIPPING_FLAT_CENTS ?? "2000",
    COMMERCE_TAX_PERCENT: from.COMMERCE_TAX_PERCENT ?? "9",
    COMMERCE_TAX_LABEL: from.COMMERCE_TAX_LABEL ?? "GST",
    STRIPE_WEBHOOK_SECRET: from.STRIPE_WEBHOOK_SECRET ?? E2E_WEBHOOK_SECRET,
  };
}
