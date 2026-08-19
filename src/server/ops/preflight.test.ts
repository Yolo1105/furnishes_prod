import { describe, expect, it } from "vitest";
import {
  capabilityFlagSnapshot,
  collectPreflightIssues,
  runBootPreflight,
} from "./preflight";

const baseEnv = {
  NODE_ENV: "test",
  CHAT_PROVIDER: "local",
  PREFERENCE_EXTRACTION_PROVIDER: "heuristic",
  CHAT_RAG_ENABLED: "0",
  CHAT_RENDERS_ENABLED: "0",
  IMAGE_RESTYLE_PROVIDER: "disabled",
  CHAT_TOOLS_ENABLED: "0",
  CHAT_COPILOT_MODE_ENABLED: "0",
  CHAT_SIDE_FEATURES_ENABLED: "0",
} as NodeJS.ProcessEnv;

/** Minimum production env that produces no fatal issues. */
const productionEnv = {
  ...baseEnv,
  NODE_ENV: "production",
  AUTH_SECRET: "x".repeat(32),
  APP_ORIGIN: "https://furnishes.example",
  SMTP_HOST: "smtp.example",
  STORAGE_PROVIDER: "s3",
  STORAGE_S3_BUCKET: "bucket",
  STORAGE_S3_REGION: "auto",
  STORAGE_S3_ACCESS_KEY_ID: "key",
  STORAGE_S3_SECRET_ACCESS_KEY: "secret",
} as NodeJS.ProcessEnv;

describe("collectPreflightIssues", () => {
  it("accepts a fully configured production env", () => {
    expect(
      collectPreflightIssues(productionEnv).filter((i) => i.level === "error"),
    ).toEqual([]);
  });

  it("errors on NEXT_PUBLIC_E2E against a public origin", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      NEXT_PUBLIC_E2E: "1",
    });
    expect(issues.some((i) => i.code === "e2e_flag_in_production")).toBe(true);
  });

  it("errors on demo sign-in against a public origin", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      ALLOW_DEMO_SIGNIN: "1",
    });
    expect(issues.some((i) => i.code === "demo_signin_in_production")).toBe(
      true,
    );
  });

  it("does not impose deployment requirements on E2E production builds", () => {
    // scripts/run-e2e.mjs builds with NODE_ENV=production, NEXT_PUBLIC_E2E=1,
    // an http APP_ORIGIN and no SMTP. Boot must still succeed.
    const issues = collectPreflightIssues({
      ...baseEnv,
      NODE_ENV: "production",
      NEXT_PUBLIC_E2E: "1",
      AUTH_SECRET: "e2e-auth-secret-phase2-32chars-min",
      APP_ORIGIN: "http://127.0.0.1:3100",
      STORAGE_PROVIDER: "local",
      IMAGE_GENERATION_PROVIDER: "test",
    });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("fails production without SMTP so silent log-mode mail cannot ship", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      SMTP_HOST: "",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "error", code: "smtp_not_configured" }),
    );
  });

  it("warns instead of failing SMTP when Clerk is configured", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      SMTP_HOST: "",
      CLERK_SECRET_KEY: "sk_test_x",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ level: "warn", code: "smtp_not_configured" }),
    );
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("requires an https APP_ORIGIN in production", () => {
    expect(
      collectPreflightIssues({ ...productionEnv, APP_ORIGIN: "" }).some(
        (i) => i.code === "app_origin_missing",
      ),
    ).toBe(true);
    expect(
      collectPreflightIssues({
        ...productionEnv,
        APP_ORIGIN: "http://furnishes.example",
      }).some((i) => i.code === "app_origin_insecure"),
    ).toBe(true);
  });

  it("accepts the Vercel production host when APP_ORIGIN is unset", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      APP_ORIGIN: "",
      VERCEL_URL: "furnishes-prod.vercel.app",
    });
    expect(issues.some((i) => i.code === "app_origin_missing")).toBe(false);
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("fails http image generation in production without creds", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      IMAGE_GENERATION_PROVIDER: "http",
    });
    expect(
      issues.some((i) => i.code === "image_generation_http_missing_creds"),
    ).toBe(true);
  });

  it("warns on local storage in production", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      STORAGE_PROVIDER: "local",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "warn",
        code: "storage_local_in_production",
      }),
    );
  });

  it("fails when renders enabled with disabled restyle provider", () => {
    const issues = collectPreflightIssues({
      ...baseEnv,
      CHAT_RENDERS_ENABLED: "1",
      IMAGE_RESTYLE_PROVIDER: "disabled",
    });
    expect(issues.some((i) => i.code === "renders_provider_disabled")).toBe(
      true,
    );
    expect(
      issues.find((i) => i.code === "renders_provider_disabled")?.level,
    ).toBe("error");
  });

  it("fails when renders enabled with empty/unknown restyle provider", () => {
    const issues = collectPreflightIssues({
      ...baseEnv,
      CHAT_RENDERS_ENABLED: "1",
      IMAGE_RESTYLE_PROVIDER: "",
    });
    expect(issues.some((i) => i.code === "renders_provider_disabled")).toBe(
      true,
    );
  });

  it("allows renders with http provider when creds present in production", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      CHAT_RENDERS_ENABLED: "1",
      IMAGE_RESTYLE_PROVIDER: "http",
      IMAGE_GENERATION_API_URL: "https://example.test",
      IMAGE_GENERATION_API_KEY: "key",
      IMAGE_GENERATION_MODEL: "model",
    });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("fails http renders in production when API creds missing", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      CHAT_RENDERS_ENABLED: "1",
      IMAGE_RESTYLE_PROVIDER: "http",
    });
    expect(issues.some((i) => i.code === "renders_http_missing_creds")).toBe(
      true,
    );
  });

  it("rejects test restyle provider outside e2e/test runtime", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      CHAT_RENDERS_ENABLED: "1",
      IMAGE_RESTYLE_PROVIDER: "test",
    });
    expect(issues.some((i) => i.code === "renders_provider_test_runtime")).toBe(
      true,
    );
  });

  it("refuses free test payments in a real production boot", () => {
    // The test provider marks orders paid without charging, so shipping it
    // would give away stock.
    const issues = collectPreflightIssues({
      ...productionEnv,
      COMMERCE_ENABLED: "1",
      COMMERCE_PAYMENT_PROVIDER: "test",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: "commerce_test_payments_in_production",
      }),
    );
  });

  it("allows the test payment provider in an E2E build", () => {
    const issues = collectPreflightIssues({
      ...baseEnv,
      NODE_ENV: "production",
      NEXT_PUBLIC_E2E: "1",
      AUTH_SECRET: "e2e-auth-secret-phase2-32chars-min",
      APP_ORIGIN: "http://127.0.0.1:3100",
      COMMERCE_ENABLED: "1",
      COMMERCE_PAYMENT_PROVIDER: "test",
    });
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("requires both stripe secrets when stripe is selected", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      COMMERCE_ENABLED: "1",
      COMMERCE_PAYMENT_PROVIDER: "stripe",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "error",
        code: "commerce_stripe_missing_creds",
      }),
    );

    // With the webhook secret absent, paid orders would never advance.
    const partial = collectPreflightIssues({
      ...productionEnv,
      COMMERCE_ENABLED: "1",
      COMMERCE_PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_live_x",
    });
    expect(
      partial.find((i) => i.code === "commerce_stripe_missing_creds")?.message,
    ).toContain("STRIPE_WEBHOOK_SECRET");

    const complete = collectPreflightIssues({
      ...productionEnv,
      COMMERCE_ENABLED: "1",
      COMMERCE_PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_live_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    });
    expect(complete.filter((i) => i.level === "error")).toEqual([]);
  });

  it("warns when the store is open with no way to pay", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      COMMERCE_ENABLED: "1",
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "warn",
        code: "commerce_enabled_without_payments",
      }),
    );
  });

  it("stays silent about payments while commerce is off", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      COMMERCE_PAYMENT_PROVIDER: "test",
    });
    expect(issues.some((i) => i.code.startsWith("commerce_"))).toBe(false);
  });

  it("warns when RAG enabled with zero DesignDoc rows", () => {
    const issues = collectPreflightIssues(
      {
        ...baseEnv,
        CHAT_RAG_ENABLED: "1",
      },
      { designDocCount: 0 },
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        level: "warn",
        code: "rag_empty_design_docs",
      }),
    );
  });

  it("does not warn on RAG when DesignDoc rows exist", () => {
    const issues = collectPreflightIssues(
      {
        ...baseEnv,
        CHAT_RAG_ENABLED: "1",
      },
      { designDocCount: 12 },
    );
    expect(issues.some((i) => i.code === "rag_empty_design_docs")).toBe(false);
  });

  it("validates tools rollout mode and percent", () => {
    const invalid = collectPreflightIssues({
      ...baseEnv,
      CHAT_TOOLS_ENABLED: "1",
      CHAT_TOOLS_ROLLOUT: "everyone",
    });
    expect(invalid.some((i) => i.code === "tools_rollout_invalid")).toBe(true);

    const badPercent = collectPreflightIssues({
      ...baseEnv,
      CHAT_TOOLS_ENABLED: "1",
      CHAT_TOOLS_ROLLOUT: "percent",
      CHAT_TOOLS_ROLLOUT_PERCENT: "150",
    });
    expect(badPercent.some((i) => i.code === "tools_percent_invalid")).toBe(
      true,
    );
  });

  it("warns on empty tools allowlist", () => {
    const issues = collectPreflightIssues({
      ...baseEnv,
      CHAT_TOOLS_ENABLED: "1",
      CHAT_TOOLS_ROLLOUT: "allowlist",
      CHAT_TOOLS_ALLOWLIST: "",
    });
    expect(issues.some((i) => i.code === "tools_allowlist_empty")).toBe(true);
  });

  it("requires openai creds in production", () => {
    const issues = collectPreflightIssues({
      ...productionEnv,
      CHAT_PROVIDER: "openai",
    });
    expect(issues.some((i) => i.code === "chat_openai_missing_creds")).toBe(
      true,
    );
  });
});

describe("capabilityFlagSnapshot", () => {
  it("documents quiz ingest as always-on rate-limited (no flag)", () => {
    const snap = capabilityFlagSnapshot(baseEnv);
    expect(snap.quizIngest).toBe("always_on_rate_limited");
    expect(snap.chatRenders).toBe(false);
    expect(snap.imageRestyleProvider).toBe("disabled");
    expect(snap.canvasPlayground).toBe(true);
  });
});

describe("runBootPreflight", () => {
  it("throws on fatal renders misconfig", async () => {
    await expect(
      runBootPreflight({
        ...baseEnv,
        CHAT_RENDERS_ENABLED: "1",
        IMAGE_RESTYLE_PROVIDER: "disabled",
      }),
    ).rejects.toThrow(/renders_provider_disabled/);
  });

  it("resolves when all capability flags are safely off", async () => {
    await expect(runBootPreflight(baseEnv)).resolves.toEqual([]);
  });
});
