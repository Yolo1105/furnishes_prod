# Phase 3 — Environment & staging verification

This phase is **mostly operational**: prove secrets, DB connectivity, and the commerce path on a **staging** (or pre-production) deploy. It corresponds to **Phase 3 — Verification** in **`docs/COMMERCE_HARDENING_CHECKLIST.md`**.

## Prerequisites

- **`npm run check`** passes (typecheck, format, lint, unit tests — same as CI **`verify`** minus **`build`**).
- Phases **1** (lint, E2E harness, webhook idempotency) and **2** (production boot guards) are implemented in the repo.
- **Migrations applied** on the database you verify against: `npx prisma migrate deploy`.
- **Boot guards**: never set `ALLOW_TEST_HELPERS` or `ALLOW_MOCK_AUTH` on **`VERCEL_ENV=production`** — see **`docs/seed-readiness/02-production-guards.md`**.

## Step A — Script gate (blocking)

Run the production readiness script with the **same env file** you use for staging (typically `.env.local` pointing at staging Postgres + test keys):

```bash
npm run verify:prod:local
```

If you load `.env` instead:

```bash
npm run verify:prod
```

**Pass criteria:** exit code **0**, no **✗** lines. Resolve every failure using **`docs/VERIFY_ENV_AND_STAGING.md`** §1 (and the “Common fixes” table).

For CI parity: on GitHub **`main`**, when Stripe test secrets are configured, the **`e2e`** workflow should pass — see **`docs/seed-readiness/01-e2e-setup.md`**.

## Step B — Staging smoke (manual)

Execute **`docs/VERIFY_ENV_AND_STAGING.md` §2** on the deployed staging URL:

1. Sign-in session
2. Cart → checkout → Stripe test payment → success
3. Stripe Dashboard: webhooks **2xx**
4. Database: order **`paid`**, **`paidAt`** set
5. Inngest: **`order/paid`** / **`handle-order-paid`**
6. Email (if Resend configured)

Record evidence (screenshots, dashboard links) for the release.

## Step C — Fulfillment (when ready)

If **`FULFILLMENT_WEBHOOK_URL`** is in scope, follow **`docs/VERIFY_ENV_AND_STAGING.md`** §3.

## Checklist (copy for release notes)

| Done | Item                                       |
| ---- | ------------------------------------------ |
| [ ]  | `verify:prod` or `verify:prod:local` green |
| [ ]  | Staging smoke §2 complete                  |
| [ ]  | Optional: fulfillment §3 exercised         |

When this table is complete for a given release, you can check off **Phase 3** in **`docs/COMMERCE_HARDENING_CHECKLIST.md`** for that environment.

**Next:** **`docs/seed-readiness/04-post-launch-hardening.md`** · then **`docs/seed-readiness/05-next-steps.md`** (ops + product roadmap).
