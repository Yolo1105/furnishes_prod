/**
 * Production boot preflight — validate feature-flag / provider combos.
 * Called from `src/instrumentation.ts` on Node runtime start.
 *
 * Quiz ingest (`POST /api/account/quiz-results`) has no feature flag; it is
 * always on for authenticated users and rate-limited (5/day/user). Preflight
 * only documents that fact in the boot snapshot.
 */

import { logOps } from "@/server/ops/log";

type PreflightLevel = "error" | "warn";

type PreflightIssue = {
  level: PreflightLevel;
  code: string;
  message: string;
};

type PreflightEnv = NodeJS.ProcessEnv;

function flagOn(env: PreflightEnv, key: string): boolean {
  return env[key] === "1";
}

function trim(env: PreflightEnv, key: string): string {
  return (env[key] ?? "").trim();
}

function restyleProvider(env: PreflightEnv): "disabled" | "test" | "http" {
  const raw = trim(env, "IMAGE_RESTYLE_PROVIDER").toLowerCase();
  if (raw === "test" || raw === "http") return raw;
  return "disabled";
}

function toolsRollout(env: PreflightEnv): string {
  return trim(env, "CHAT_TOOLS_ROLLOUT").toLowerCase() || "shadow";
}

function isTestRuntime(env: PreflightEnv): boolean {
  return env.NEXT_PUBLIC_E2E === "1" || env.NODE_ENV === "test";
}

function isLocalAppOrigin(env: PreflightEnv): boolean {
  const origin = trim(env, "APP_ORIGIN").toLowerCase();
  return (
    origin.length === 0 ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1")
  );
}

/**
 * Pure env checks (+ optional DesignDoc count). Safe to unit-test without DB.
 */
export function collectPreflightIssues(
  env: PreflightEnv,
  options: { designDocCount?: number | null } = {},
): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const production = env.NODE_ENV === "production";

  // --- Fatal: renders on without a usable restyle provider ---
  if (flagOn(env, "CHAT_RENDERS_ENABLED")) {
    const provider = restyleProvider(env);
    if (provider === "disabled") {
      issues.push({
        level: "error",
        code: "renders_provider_disabled",
        message:
          "CHAT_RENDERS_ENABLED=1 requires IMAGE_RESTYLE_PROVIDER=test|http (not disabled).",
      });
    } else if (provider === "test" && !isTestRuntime(env)) {
      issues.push({
        level: "error",
        code: "renders_provider_test_runtime",
        message:
          "IMAGE_RESTYLE_PROVIDER=test is only allowed when NEXT_PUBLIC_E2E=1 or NODE_ENV=test.",
      });
    } else if (provider === "http" && production) {
      const missing = [
        "IMAGE_GENERATION_API_URL",
        "IMAGE_GENERATION_API_KEY",
        "IMAGE_GENERATION_MODEL",
      ].filter((key) => !trim(env, key));
      if (missing.length > 0) {
        issues.push({
          level: "error",
          code: "renders_http_missing_creds",
          message: `CHAT_RENDERS_ENABLED=1 with http restyle is missing: ${missing.join(", ")}.`,
        });
      }
    }
  }

  // --- Warn: RAG on with empty corpus ---
  if (flagOn(env, "CHAT_RAG_ENABLED")) {
    if (options.designDocCount === 0) {
      issues.push({
        level: "warn",
        code: "rag_empty_design_docs",
        message:
          "CHAT_RAG_ENABLED=1 but DesignDoc count is 0. Seed with SEED_RAG=1 pnpm db:seed:rag.",
      });
    } else if (options.designDocCount == null && production) {
      issues.push({
        level: "warn",
        code: "rag_design_doc_count_unknown",
        message:
          "CHAT_RAG_ENABLED=1 but DesignDoc count could not be checked at boot.",
      });
    }
  }

  // --- Production provider / secret hygiene ---
  if (production) {
    if (trim(env, "CHAT_PROVIDER").toLowerCase() === "openai") {
      const missing = ["OPENAI_API_KEY", "CHAT_MODEL_PRIMARY"].filter(
        (key) => !trim(env, key),
      );
      if (missing.length > 0) {
        issues.push({
          level: "error",
          code: "chat_openai_missing_creds",
          message: `CHAT_PROVIDER=openai is missing: ${missing.join(", ")}.`,
        });
      }
    }

    if (
      trim(env, "PREFERENCE_EXTRACTION_PROVIDER").toLowerCase() === "openai"
    ) {
      const missing = ["OPENAI_API_KEY", "PREFERENCE_EXTRACTION_MODEL"].filter(
        (key) => !trim(env, key),
      );
      if (missing.length > 0) {
        issues.push({
          level: "error",
          code: "extraction_openai_missing_creds",
          message: `PREFERENCE_EXTRACTION_PROVIDER=openai is missing: ${missing.join(", ")}.`,
        });
      }
    }

    const authSecret = trim(env, "AUTH_SECRET");
    if (authSecret.length < 32) {
      issues.push({
        level: "error",
        code: "auth_secret_too_short",
        message: "AUTH_SECRET must be at least 32 characters in production.",
      });
    }

    // E2E builds run NODE_ENV=production against a local origin with no mail
    // server, so these real-deployment requirements would fail that boot.
    if (!isTestRuntime(env)) {
      // Without SMTP the email adapter only logs, so verification and password
      // reset silently never reach the user while signup still reports success.
      if (!trim(env, "SMTP_HOST")) {
        issues.push({
          level: "error",
          code: "smtp_not_configured",
          message:
            "SMTP_HOST is required in production; without it verification and reset mail is only logged.",
        });
      }

      const appOrigin = trim(env, "APP_ORIGIN");
      if (!appOrigin) {
        issues.push({
          level: "error",
          code: "app_origin_missing",
          message:
            "APP_ORIGIN must be the public origin in production (used for email links and Secure cookies).",
        });
      } else if (!appOrigin.startsWith("https://")) {
        issues.push({
          level: "error",
          code: "app_origin_insecure",
          message: `APP_ORIGIN must use https in production (got "${appOrigin}").`,
        });
      }
    }

    if (trim(env, "IMAGE_GENERATION_PROVIDER").toLowerCase() === "http") {
      const missing = [
        "IMAGE_GENERATION_API_URL",
        "IMAGE_GENERATION_API_KEY",
        "IMAGE_GENERATION_MODEL",
      ].filter((key) => !trim(env, key));
      if (missing.length > 0) {
        issues.push({
          level: "error",
          code: "image_generation_http_missing_creds",
          message: `IMAGE_GENERATION_PROVIDER=http is missing: ${missing.join(", ")}.`,
        });
      }
    }

    if (flagOn(env, "COMMERCE_ENABLED")) {
      const payments =
        trim(env, "COMMERCE_PAYMENT_PROVIDER").toLowerCase() || "disabled";

      // The test provider settles every payment locally for free. Shipping it
      // would hand out furniture, so it is barred outside a test runtime.
      if (payments === "test" && !isTestRuntime(env)) {
        issues.push({
          level: "error",
          code: "commerce_test_payments_in_production",
          message:
            "COMMERCE_PAYMENT_PROVIDER=test settles payments for free and is only allowed when NEXT_PUBLIC_E2E=1 or NODE_ENV=test.",
        });
      }

      if (payments === "stripe") {
        const missing = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"].filter(
          (key) => !trim(env, key),
        );
        if (missing.length > 0) {
          issues.push({
            level: "error",
            code: "commerce_stripe_missing_creds",
            message: `COMMERCE_PAYMENT_PROVIDER=stripe is missing: ${missing.join(", ")}. Without the webhook secret, orders never leave pending_payment.`,
          });
        }
      }

      if (payments === "disabled") {
        issues.push({
          level: "warn",
          code: "commerce_enabled_without_payments",
          message:
            "COMMERCE_ENABLED=1 with no payment provider: shoppers can fill a cart but checkout will refuse.",
        });
      }
    }

    const storageProvider =
      trim(env, "STORAGE_PROVIDER").toLowerCase() || "local";

    if (!isTestRuntime(env) && storageProvider === "local") {
      issues.push({
        level: "warn",
        code: "storage_local_in_production",
        message:
          "STORAGE_PROVIDER=local writes to .data/uploads and is single-instance only; use s3 to scale out.",
      });
    }

    if (storageProvider === "s3") {
      const missing = [
        "STORAGE_S3_BUCKET",
        "STORAGE_S3_REGION",
        "STORAGE_S3_ACCESS_KEY_ID",
        "STORAGE_S3_SECRET_ACCESS_KEY",
      ].filter((key) => !trim(env, key));
      if (missing.length > 0) {
        issues.push({
          level: "error",
          code: "storage_s3_missing_creds",
          message: `STORAGE_PROVIDER=s3 is missing: ${missing.join(", ")}.`,
        });
      }
    }

    if (env.NEXT_PUBLIC_E2E === "1" && !isLocalAppOrigin(env)) {
      issues.push({
        level: "error",
        code: "e2e_flag_in_production",
        message:
          "NEXT_PUBLIC_E2E=1 in production unlocks test payment settlement and the test restyle provider.",
      });
    }

    if (
      env.ALLOW_DEMO_SIGNIN === "1" ||
      env.NEXT_PUBLIC_ALLOW_DEMO_SIGNIN === "1"
    ) {
      if (!isLocalAppOrigin(env) && env.NEXT_PUBLIC_E2E !== "1") {
        issues.push({
          level: "error",
          code: "demo_signin_in_production",
          message:
            "ALLOW_DEMO_SIGNIN=1 grants a session with no credentials on a well-known email address.",
        });
      } else {
        issues.push({
          level: "warn",
          code: "demo_signin_enabled",
          message: "Demo sign-in is enabled in production (ALLOW_DEMO_SIGNIN).",
        });
      }
    }
  }

  // --- Tools rollout sanity ---
  if (flagOn(env, "CHAT_TOOLS_ENABLED")) {
    const mode = toolsRollout(env);
    if (!["shadow", "allowlist", "percent"].includes(mode)) {
      issues.push({
        level: "error",
        code: "tools_rollout_invalid",
        message: `CHAT_TOOLS_ROLLOUT must be shadow|allowlist|percent (got "${mode}").`,
      });
    }
    if (mode === "allowlist" && !trim(env, "CHAT_TOOLS_ALLOWLIST")) {
      issues.push({
        level: "warn",
        code: "tools_allowlist_empty",
        message:
          "CHAT_TOOLS_ROLLOUT=allowlist but CHAT_TOOLS_ALLOWLIST is empty — no user will execute tools.",
      });
    }
    if (mode === "percent") {
      const percent = Number(env.CHAT_TOOLS_ROLLOUT_PERCENT ?? "0");
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        issues.push({
          level: "error",
          code: "tools_percent_invalid",
          message: "CHAT_TOOLS_ROLLOUT_PERCENT must be 0–100.",
        });
      }
    }
  }

  // Copilot without tools is allowed (page-context mode); just note side features.
  if (
    flagOn(env, "CHAT_COPILOT_MODE_ENABLED") &&
    !flagOn(env, "CHAT_SIDE_FEATURES_ENABLED")
  ) {
    issues.push({
      level: "warn",
      code: "copilot_side_features_off",
      message:
        "CHAT_COPILOT_MODE_ENABLED=1 while CHAT_SIDE_FEATURES_ENABLED=0 — suggestions/brainstorm stay disabled.",
    });
  }

  return issues;
}

/** Snapshot of capability flags for boot logs (no secrets). */
export function capabilityFlagSnapshot(
  env: PreflightEnv,
): Record<string, string | number | boolean | null> {
  return {
    chatProvider: trim(env, "CHAT_PROVIDER") || "local",
    requireEmailVerification: flagOn(env, "REQUIRE_EMAIL_VERIFICATION"),
    commerce: flagOn(env, "COMMERCE_ENABLED"),
    paymentProvider: trim(env, "COMMERCE_PAYMENT_PROVIDER") || "disabled",
    preferenceExtraction:
      trim(env, "PREFERENCE_EXTRACTION_PROVIDER") || "heuristic",
    chatRag: flagOn(env, "CHAT_RAG_ENABLED"),
    chatSummary: flagOn(env, "CHAT_SUMMARY_ENABLED"),
    chatWorkflow: flagOn(env, "CHAT_WORKFLOW_ENABLED"),
    chatSideFeatures: flagOn(env, "CHAT_SIDE_FEATURES_ENABLED"),
    chatRoomPlan: flagOn(env, "CHAT_ROOM_PLAN_ENABLED"),
    designBrief: flagOn(env, "DESIGN_BRIEF_ENABLED"),
    chatTools: flagOn(env, "CHAT_TOOLS_ENABLED"),
    chatToolsRollout: flagOn(env, "CHAT_TOOLS_ENABLED")
      ? toolsRollout(env)
      : "off",
    chatCopilot: flagOn(env, "CHAT_COPILOT_MODE_ENABLED"),
    chatRenders: flagOn(env, "CHAT_RENDERS_ENABLED"),
    imageRestyleProvider: restyleProvider(env),
    chatShare: flagOn(env, "CHAT_SHARE_ENABLED"),
    chatInsights: flagOn(env, "CHAT_INSIGHTS_ENABLED"),
    studio: flagOn(env, "STUDIO_ENABLED"),
    canvasPlayground: env.CANVAS_PLAYGROUND_ENABLED !== "0",
    // Always-on rate-limited API — not a flag
    quizIngest: "always_on_rate_limited",
  };
}

async function countDesignDocs(): Promise<number | null> {
  try {
    const { prisma } = await import("@/server/db");
    return await prisma.designDoc.count();
  } catch {
    return null;
  }
}

/**
 * Run boot preflight: log flag snapshot, warn on soft issues, throw on errors.
 */
export async function runBootPreflight(
  env: PreflightEnv = process.env,
): Promise<PreflightIssue[]> {
  const designDocCount = flagOn(env, "CHAT_RAG_ENABLED")
    ? await countDesignDocs()
    : undefined;

  const issues = collectPreflightIssues(
    env,
    designDocCount === undefined ? {} : { designDocCount },
  );
  const snapshot = capabilityFlagSnapshot(env);

  logOps("info", "preflight_flags", {
    ...snapshot,
    designDocCount:
      designDocCount === undefined ? null : (designDocCount ?? -1),
  });

  for (const issue of issues) {
    logOps(issue.level === "error" ? "error" : "warn", "preflight_issue", {
      code: issue.code,
      message: issue.message,
    });
  }

  const errors = issues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    throw new Error(
      `Boot preflight failed: ${errors.map((e) => e.code).join(", ")}`,
    );
  }

  return issues;
}
