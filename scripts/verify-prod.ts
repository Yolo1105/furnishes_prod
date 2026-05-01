#!/usr/bin/env tsx
/**
 * Production verification script.
 *
 * Run BEFORE going live (and after any major env change) to catch
 * misconfigurations before users do.
 *
 * Usage:
 *   npm run verify:prod
 *
 * Load `.env.local`:
 *   npm run verify:prod:local
 *
 * Full runbook: docs/VERIFY_ENV_AND_STAGING.md
 *
 * Or directly:
 *   tsx scripts/verify-prod.ts
 *
 * Exits with code 0 if everything passes, 1 on any failure.
 * In CI/CD, gate your deploy on this exit code.
 *
 * The script is intentionally non-destructive — it reads, signs, pings,
 * and queries, but never writes anything users would see.
 */

import "dotenv/config"; // load .env.local automatically

/* ── Output formatting ─────────────────────────────────────── */

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

let passed = 0;
let warned = 0;
let failed = 0;
let skipped = 0;

function pass(name: string, detail?: string) {
  passed++;
  console.log(
    `  ${COLORS.green}✓${COLORS.reset} ${name}${detail ? COLORS.gray + " — " + detail + COLORS.reset : ""}`,
  );
}

function fail(name: string, error: string) {
  failed++;
  console.log(`  ${COLORS.red}✗ ${name}${COLORS.reset}`);
  console.log(`    ${COLORS.red}${error}${COLORS.reset}`);
}

function warn(name: string, message: string) {
  warned++;
  console.log(`  ${COLORS.yellow}⚠ ${name}${COLORS.reset}`);
  console.log(`    ${COLORS.yellow}${message}${COLORS.reset}`);
}

function skip(name: string, reason: string) {
  skipped++;
  console.log(`  ${COLORS.gray}○ ${name} (skipped: ${reason})${COLORS.reset}`);
}

function section(title: string) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}${title}${COLORS.reset}`);
}

/* ── Main ──────────────────────────────────────────────────── */

async function main() {
  console.log(
    `\n${COLORS.bold}Furnishes — Production Readiness Check${COLORS.reset}`,
  );
  console.log(
    `${COLORS.gray}Environment: ${process.env.NODE_ENV ?? "unset"}${COLORS.reset}\n`,
  );

  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  await checkEnvVars(isProd);
  await checkCommerceConfig(isProd);
  await checkSafetyFlags(isProd);
  await checkDatabase();
  await checkAuth();
  await checkResend();
  await checkStripe();
  await checkR2();
  await checkInngest();
  await checkSentry();
  await checkUpstash();

  // Summary
  console.log(
    `\n${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`,
  );
  console.log(
    `${COLORS.green}${passed} passed${COLORS.reset} · ` +
      `${COLORS.yellow}${warned} warned${COLORS.reset} · ` +
      `${COLORS.red}${failed} failed${COLORS.reset} · ` +
      `${COLORS.gray}${skipped} skipped${COLORS.reset}`,
  );

  if (failed > 0) {
    console.log(
      `\n${COLORS.red}${COLORS.bold}❌ NOT READY for production${COLORS.reset}`,
    );
    console.log(
      `${COLORS.gray}Fix the failures above before deploying.${COLORS.reset}\n`,
    );
    process.exit(1);
  }
  if (warned > 0 && isProd) {
    console.log(
      `\n${COLORS.yellow}${COLORS.bold}⚠️  Ready with warnings${COLORS.reset}`,
    );
    console.log(
      `${COLORS.gray}Review warnings — they may bite you in production.${COLORS.reset}\n`,
    );
    process.exit(0);
  }
  console.log(
    `\n${COLORS.green}${COLORS.bold}✅ Ready for production${COLORS.reset}\n`,
  );
  process.exit(0);
}

/* ── Individual checks ─────────────────────────────────────── */

async function checkEnvVars(isProd: boolean) {
  section("1. Required environment variables");

  const required = ["DATABASE_URL"];

  const requiredInProd = [
    "RESEND_API_KEY",
    "RESEND_FROM_ADDRESS",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];

  const optional = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "DIRECT_URL",
  ];

  for (const key of required) {
    if (process.env[key]) pass(key);
    else fail(key, "REQUIRED env var is missing");
  }

  const authSecret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (authSecret) {
    pass("AUTH_SECRET / NEXTAUTH_SECRET", "at least one set");
  } else {
    fail(
      "AUTH_SECRET / NEXTAUTH_SECRET",
      "REQUIRED — JWT signing will fail in production",
    );
  }

  const publicOrigin =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim();
  if (publicOrigin) {
    pass(
      "Public URL (NEXTAUTH_URL / AUTH_URL / PUBLIC_SITE_URL)",
      publicOrigin,
    );
  } else if (isProd) {
    fail(
      "Public site URL",
      "Set NEXTAUTH_URL, AUTH_URL, or PUBLIC_SITE_URL — emails and webhooks need absolute links",
    );
  } else {
    warn(
      "Public site URL",
      "None of NEXTAUTH_URL / AUTH_URL / PUBLIC_SITE_URL set — in dev getPublicOrigin() may use localhost; in production it throws unless VERCEL_URL or ALLOW_PUBLIC_ORIGIN_LOCALHOST_FALLBACK=1",
    );
  }

  for (const key of requiredInProd) {
    if (process.env[key]) {
      pass(key);
    } else if (isProd) {
      fail(
        key,
        "Required in production — service will silently no-op or hard-fail",
      );
    } else {
      warn(key, "Not set — service is disabled (OK in dev, NOT OK in prod)");
    }
  }

  for (const key of optional) {
    if (process.env[key]) pass(key, "(optional)");
    else skip(key, "optional");
  }
}

async function checkCommerceConfig(isProd: boolean) {
  section("2. Commerce (UI vs API)");

  const pub = process.env.NEXT_PUBLIC_COMMERCE_ENABLED?.trim() === "1";
  const raw = process.env.COMMERCE_BACKEND_ENABLED?.trim().toLowerCase();
  const backendExplicitOff = raw === "0" || raw === "false" || raw === "no";
  const backendExplicitOn = raw === "1" || raw === "true" || raw === "yes";

  if (backendExplicitOn) {
    pass("COMMERCE_BACKEND_ENABLED", "explicitly enabled (checkout API on)");
  } else if (backendExplicitOff) {
    pass("COMMERCE_BACKEND_ENABLED", "explicitly disabled (checkout API off)");
  } else {
    pass(
      "COMMERCE_BACKEND_ENABLED",
      "unset — backend follows NEXT_PUBLIC_COMMERCE_ENABLED only",
    );
  }

  if (pub && backendExplicitOff && isProd) {
    warn(
      "Commerce UI vs API mismatch",
      "NEXT_PUBLIC_COMMERCE_ENABLED=1 but COMMERCE_BACKEND_ENABLED=0 — cart UI may show while POST /api/checkout/intent returns 501",
    );
  } else if (!pub && backendExplicitOn) {
    warn(
      "Commerce UI vs API mismatch",
      "COMMERCE_BACKEND_ENABLED on but NEXT_PUBLIC_COMMERCE_ENABLED is not 1 — APIs may work while nav hides commerce",
    );
  } else if (pub && isProd && !backendExplicitOn && !backendExplicitOff) {
    warn(
      "COMMERCE_BACKEND_ENABLED",
      "Not set explicitly in production — set to 1 when checkout should be live, or 0 to force APIs off",
    );
  } else {
    pass("Commerce config", "consistent");
  }

  const commerceLive = (pub || backendExplicitOn) && !backendExplicitOff;
  if (isProd && commerceLive) {
    const wh = process.env.FULFILLMENT_WEBHOOK_URL?.trim();
    if (!wh) {
      warn(
        "FULFILLMENT_WEBHOOK_URL",
        "Commerce is enabled but outbound fulfillment webhook is unset — paid orders only emit stub logs until you configure a receiver",
      );
    } else {
      pass("FULFILLMENT_WEBHOOK_URL", "set");
    }
  }
}

/** True only for the live production deploy (not Vercel preview / local prod-like runs). */
function isTrueProductionDeploy(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.DEPLOYMENT_ENV === "production"
  );
}

async function checkSafetyFlags(isProd: boolean) {
  section("3. Production safety flags");

  // MUST be off on the canonical production deploy (preview may still use NODE_ENV=production)
  if (isTrueProductionDeploy()) {
    if (process.env.ALLOW_TEST_HELPERS === "1") {
      fail(
        "ALLOW_TEST_HELPERS",
        "MUST NOT be set on production — leaks signup verification tokens to clients.",
      );
    } else {
      pass("ALLOW_TEST_HELPERS", "unset");
    }
    if (process.env.ALLOW_MOCK_AUTH === "1") {
      fail(
        "ALLOW_MOCK_AUTH",
        "MUST NOT be set on production — enables mock-auth cookie bypass.",
      );
    } else {
      pass("ALLOW_MOCK_AUTH", "unset");
    }
  } else if (isProd && process.env.ALLOW_TEST_HELPERS === "1") {
    warn(
      "ALLOW_TEST_HELPERS",
      "Enabled while NODE_ENV=production — fine for local `next start` / CI; never set on Vercel production.",
    );
  }

  // MUST be off in production (demo login button)
  const dangerInProd = ["NEXT_PUBLIC_SHOW_DEMO_LOGIN"];

  for (const key of dangerInProd) {
    const val = process.env[key];
    if (isProd && (val === "1" || val === "true")) {
      fail(key, `MUST NOT be enabled in production. Currently "${val}".`);
    } else if (val === "1" || val === "true") {
      warn(key, `Enabled — fine in dev, ensure it's UNSET in prod`);
    } else {
      pass(key, "disabled");
    }
  }

  const mockPublic = process.env.NEXT_PUBLIC_MOCK_AUTH;
  if (mockPublic === "1" || mockPublic === "true") {
    if (isProd) {
      warn(
        "NEXT_PUBLIC_MOCK_AUTH",
        "UI-only flag. Server mock auth requires ALLOW_MOCK_AUTH=1 — NEXT_PUBLIC_* does not enable middleware mock auth.",
      );
    } else {
      warn(
        "NEXT_PUBLIC_MOCK_AUTH",
        "Enabled for dev UI — ensure UNSET in prod or pair with ALLOW_MOCK_AUTH for server mock auth.",
      );
    }
  } else {
    pass("NEXT_PUBLIC_MOCK_AUTH", "disabled");
  }

  // AUTH_SECRET / NEXTAUTH_SECRET strength
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (secret) {
    if (secret.length < 32) {
      fail(
        "AUTH_SECRET / NEXTAUTH_SECRET strength",
        `Only ${secret.length} chars. Generate: openssl rand -base64 32`,
      );
    } else if (secret === "your-secret-here" || secret.includes("change-me")) {
      fail(
        "AUTH_SECRET / NEXTAUTH_SECRET strength",
        "Looks like a placeholder. Generate a real secret.",
      );
    } else {
      pass("Auth secret strength", `${secret.length} chars`);
    }
  }

  // Public URL must be HTTPS in prod (any alias used for links)
  const siteUrl =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    if (isProd && !siteUrl.startsWith("https://")) {
      fail(
        "Public URL scheme",
        `Must be https:// in production. Got: ${siteUrl}`,
      );
    } else {
      pass(
        "Public URL scheme",
        siteUrl.startsWith("https://") ? "https" : siteUrl,
      );
    }
  }
}

async function checkDatabase() {
  section("4. Database");

  if (!process.env.DATABASE_URL) {
    fail("Database connection", "DATABASE_URL not set");
    return;
  }

  const rawDbUrl = process.env.DATABASE_URL.trim();
  const isPostgresUrl =
    rawDbUrl.startsWith("postgresql://") || rawDbUrl.startsWith("postgres://");
  if (!isPostgresUrl) {
    fail(
      "Database connection",
      'Schema uses PostgreSQL (`provider = "postgresql"` in prisma/schema.prisma). ' +
        "DATABASE_URL must start with postgresql:// or postgres://. " +
        "SQLite `file:` URLs will not pass this check — use a staging Postgres URL when running verify:prod, " +
        "or set DATABASE_URL only for this command: " +
        "`cross-env DATABASE_URL=postgresql://... npm run verify:prod`.",
    );
    return;
  }

  try {
    const { prisma } = await import("../lib/eva/db").catch((e) => {
      throw new Error(
        `Failed to load Prisma client (run \`npx prisma generate\`): ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });

    // Simple ping
    await prisma.$queryRaw`SELECT 1 as ping`;
    pass("Database reachable");

    // Check schema is migrated — User table exists
    try {
      const userCount = await prisma.user.count();
      pass("Schema migrated", `User table exists (${userCount} users)`);
    } catch {
      fail(
        "Schema migrated",
        "User table missing. Run: npx prisma migrate deploy",
      );
    }

    // Check Auth.js tables exist
    try {
      const sessionCount = await prisma.session.count();
      pass("Auth.js tables present", `${sessionCount} active sessions`);
    } catch {
      fail(
        "Auth.js tables present",
        "Session table missing. Run: npx prisma migrate deploy",
      );
    }

    // Warn if no admin user exists
    try {
      const adminCount = await prisma.user.count({
        where: { role: { in: ["staff", "admin"] } },
      });
      if (adminCount === 0) {
        warn(
          "Admin user exists",
          "No staff/admin users — you can't reply to support tickets. " +
            "UPDATE \"User\" SET role = 'admin' WHERE email = 'you@yourcompany.com';",
        );
      } else {
        pass("Admin user exists", `${adminCount} staff/admin user(s)`);
      }
    } catch {
      // role column doesn't exist — schema not fully migrated
      warn("Admin user check", "User.role column missing — re-run migrations");
    }

    await prisma.$disconnect();
  } catch (e) {
    fail("Database connection", e instanceof Error ? e.message : String(e));
  }
}

async function checkAuth() {
  section("5. Auth.js configuration");

  try {
    // Verify the auth module loads without crashing
    const { auth } = await import("../auth").catch((e) => {
      throw new Error(`Failed to import auth.ts: ${e.message}`);
    });
    if (typeof auth !== "function") {
      fail(
        "auth() export",
        "auth.ts loaded but doesn't export auth() function",
      );
      return;
    }
    pass("auth.ts loads");

    // Check Google OAuth config if credentials are present
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      pass("Google OAuth credentials", "set");
    } else if (
      process.env.GOOGLE_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_SECRET
    ) {
      fail(
        "Google OAuth credentials",
        "One of GOOGLE_CLIENT_ID/SECRET is set but not both — Google login will fail",
      );
    } else {
      skip("Google OAuth", "credentials not set");
    }
  } catch (e) {
    fail("Auth.js configuration", e instanceof Error ? e.message : String(e));
  }
}

async function checkResend() {
  section("6. Resend (email)");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    skip("Resend", "RESEND_API_KEY not set");
    return;
  }

  if (!apiKey.startsWith("re_")) {
    fail(
      "Resend API key format",
      "Should start with 're_'. Got: " + apiKey.slice(0, 5) + "…",
    );
    return;
  }
  pass("Resend API key format");

  const fromAddress = process.env.RESEND_FROM_ADDRESS;
  if (!fromAddress) {
    warn(
      "RESEND_FROM_ADDRESS",
      "Not set — falling back to default no-reply@furnishes.sg",
    );
  } else if (!fromAddress.includes("@") || !fromAddress.includes("<")) {
    warn(
      "RESEND_FROM_ADDRESS format",
      `Expected "Name <addr@domain>" format. Got: ${fromAddress}`,
    );
  } else {
    pass("RESEND_FROM_ADDRESS format");
  }

  // Live API check — list domains. Doesn't send anything.
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.status === 401) {
      fail(
        "Resend API auth",
        "401 Unauthorized — API key is invalid or revoked",
      );
    } else if (res.ok) {
      const body = (await res.json()) as {
        data?: Array<{ name: string; status: string }>;
      };
      const domains = body.data ?? [];
      const verified = domains.filter((d) => d.status === "verified");
      if (verified.length === 0) {
        fail(
          "Resend domain verified",
          "No verified domains. Add + verify your sending domain at resend.com/domains",
        );
      } else {
        pass("Resend domain verified", verified.map((d) => d.name).join(", "));
      }
    } else {
      warn("Resend API check", `Unexpected status ${res.status}`);
    }
  } catch (e) {
    warn("Resend API reachable", e instanceof Error ? e.message : String(e));
  }
}

async function checkStripe() {
  section("7. Stripe (payments)");

  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!secret) {
    skip("Stripe", "STRIPE_SECRET_KEY not set");
    return;
  }

  // Format checks
  if (secret.startsWith("sk_test_")) {
    pass("Stripe secret key format", "TEST mode — not for production!");
    if (
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL_ENV === "production"
    ) {
      fail(
        "Stripe mode",
        "Using TEST keys in production. Switch to sk_live_*.",
      );
    }
  } else if (secret.startsWith("sk_live_")) {
    pass("Stripe secret key format", "LIVE mode");
  } else {
    fail("Stripe secret key format", "Doesn't start with sk_test_ or sk_live_");
  }

  if (publishable) {
    if (
      publishable.startsWith("pk_test_") ||
      publishable.startsWith("pk_live_")
    ) {
      // Make sure publishable mode matches secret mode
      const secretIsLive = secret.startsWith("sk_live_");
      const pubIsLive = publishable.startsWith("pk_live_");
      if (secretIsLive !== pubIsLive) {
        fail(
          "Stripe key mode mismatch",
          `Secret is ${secretIsLive ? "LIVE" : "TEST"} but publishable is ${pubIsLive ? "LIVE" : "TEST"}`,
        );
      } else {
        pass("Stripe publishable key", "matches secret mode");
      }
    } else {
      fail("Stripe publishable key format", "Doesn't start with pk_*");
    }
  } else {
    fail(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "Required for client-side checkout",
    );
  }

  if (!webhookSecret) {
    fail("STRIPE_WEBHOOK_SECRET", "Required — webhook events will be rejected");
  } else if (!webhookSecret.startsWith("whsec_")) {
    fail("STRIPE_WEBHOOK_SECRET format", "Should start with 'whsec_'");
  } else {
    pass("STRIPE_WEBHOOK_SECRET format");
  }

  // Live API ping
  try {
    const res = await fetch(
      "https://api.stripe.com/v1/payment_methods?limit=1",
      {
        headers: { Authorization: `Bearer ${secret}` },
      },
    );
    if (res.status === 401) {
      fail("Stripe API auth", "401 Unauthorized — secret key invalid");
    } else if (res.ok) {
      pass("Stripe API reachable");
    } else {
      warn("Stripe API check", `Status ${res.status}`);
    }
  } catch (e) {
    warn("Stripe API reachable", e instanceof Error ? e.message : String(e));
  }
}

async function checkR2() {
  section("8. Cloudflare R2 (file storage)");

  const allFour =
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME;

  if (!allFour) {
    skip("R2", "credentials not set (file uploads will fail)");
    if (process.env.NEXT_PUBLIC_USE_R2_UPLOADS === "1") {
      warn(
        "NEXT_PUBLIC_USE_R2_UPLOADS",
        "Set to 1 but R2 credentials missing — chat uploads will fail",
      );
    }
    return;
  }

  if (
    process.env.NEXT_PUBLIC_USE_R2_UPLOADS === "1" &&
    !process.env.R2_PUBLIC_URL?.trim()
  ) {
    warn(
      "R2_PUBLIC_URL",
      "NEXT_PUBLIC_USE_R2_UPLOADS=1 but R2_PUBLIC_URL unset — confirm step cannot build public file URLs",
    );
  } else if (process.env.R2_PUBLIC_URL?.trim()) {
    pass("R2_PUBLIC_URL", "set");
  }

  // Try to sign a URL and HEAD a non-existent object
  try {
    const r2Module = await import("../lib/storage/r2").catch((e) => {
      throw new Error("Failed to load lib/storage/r2: " + e.message);
    });

    const result = await r2Module.signUploadUrl({
      prefix: "_verify",
      filename: "ping.txt",
      mimeType: "image/png",
      sizeBytes: 100,
      userId: "_verify",
    });

    if (result.ok) {
      pass("R2 signing", "successfully generated presigned URL");
    } else {
      fail("R2 signing", result.error);
    }
  } catch (e) {
    fail("R2 check", e instanceof Error ? e.message : String(e));
  }
}

async function checkInngest() {
  section("9. Inngest (background jobs)");

  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;

  if (!eventKey && !signingKey) {
    skip("Inngest", "keys not set (cron jobs will not run)");
    return;
  }

  if (!eventKey) fail("INNGEST_EVENT_KEY", "missing");
  else pass("INNGEST_EVENT_KEY", "set");

  if (!signingKey) fail("INNGEST_SIGNING_KEY", "missing");
  else pass("INNGEST_SIGNING_KEY", "set");

  // Verify the inngest module loads
  try {
    const { inngestFunctions } = await import("../lib/jobs/inngest");
    pass(
      "Inngest functions registered",
      `${inngestFunctions.length} functions`,
    );
  } catch (e) {
    fail("Inngest module", e instanceof Error ? e.message : String(e));
  }
}

async function checkSentry() {
  section("10. Sentry (error tracking)");

  const dsn = process.env.SENTRY_DSN;
  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn && !publicDsn) {
    skip("Sentry", "no DSN set (errors will go silent)");
    return;
  }

  if (!dsn) warn("SENTRY_DSN", "missing — server errors won't be captured");
  else pass("SENTRY_DSN", "set");

  if (!publicDsn)
    warn(
      "NEXT_PUBLIC_SENTRY_DSN",
      "missing — browser errors won't be captured",
    );
  else pass("NEXT_PUBLIC_SENTRY_DSN", "set");

  // Validate DSN format
  if (dsn) {
    try {
      const u = new URL(dsn);
      if (!u.hostname.includes("sentry.io") && !u.hostname.includes("ingest")) {
        warn("SENTRY_DSN format", `Hostname looks unusual: ${u.hostname}`);
      } else {
        pass("SENTRY_DSN format", "valid");
      }
    } catch {
      fail("SENTRY_DSN format", "Not a valid URL");
    }
  }
}

async function checkUpstash() {
  section("11. Upstash Redis (rate limiting)");

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url && !token) {
    skip(
      "Upstash",
      "not set (rate limiting will fall back to in-memory or be disabled)",
    );
    return;
  }

  if (!url) fail("UPSTASH_REDIS_REST_URL", "missing");
  else pass("UPSTASH_REDIS_REST_URL", "set");

  if (!token) fail("UPSTASH_REDIS_REST_TOKEN", "missing");
  else pass("UPSTASH_REDIS_REST_TOKEN", "set");

  // Live ping
  if (url && token) {
    try {
      const res = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        pass("Upstash reachable");
      } else if (res.status === 401) {
        fail("Upstash auth", "401 Unauthorized — token invalid");
      } else {
        warn("Upstash check", `Status ${res.status}`);
      }
    } catch (e) {
      warn("Upstash reachable", e instanceof Error ? e.message : String(e));
    }
  }
}

/* ── Run ──────────────────────────────────────────────────── */

main().catch((e) => {
  console.error(
    `\n${COLORS.red}${COLORS.bold}Verification crashed:${COLORS.reset}`,
  );
  console.error(e);
  process.exit(2);
});
