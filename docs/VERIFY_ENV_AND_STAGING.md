# Env & staging verification (runbook)

Follow in order. This matches the engineering plan: **verify locally → staging smoke → fulfillment → optional lint/image polish.**

Seed-readiness **Phase 3** wraps these steps: **`docs/seed-readiness/03-verification.md`**.

## 1. Local / CI: production readiness script

### Prerequisites

- **`DATABASE_URL`** must be **PostgreSQL** (`postgresql://` or `postgres://`). The Prisma schema uses `provider = "postgresql"`; a local SQLite `file:` URL will **fail** the DB step on purpose — use a **staging or Neon/Supabase** URL when validating deploy config.
- **`AUTH_SECRET`** or **`NEXTAUTH_SECRET`** (long random string; see `verify-prod` output for length checks in safety section).

### Commands

```bash
# Default: loads `.env` (if present)
npm run verify:prod

# Load `.env.local` (typical on a dev machine)
npm run verify:prod:local
```

### What “green” means

- Exit code **0**, no **✗** lines (warnings may be OK outside true production).
- Fix every **failure** before treating the app as deploy-ready.

Related: **`docs/seed-readiness/02-production-guards.md`** (runtime boot guards vs `verify:prod` safety checks).

### Common fixes

| Failure                                      | Action                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Auth secret missing                          | Set `AUTH_SECRET` or `NEXTAUTH_SECRET` in the env file you load.                                                                      |
| DB URL not Postgres                          | Use a Postgres URL for this check, or override only for the command: `cross-env DATABASE_URL="postgresql://..." npm run verify:prod`. |
| Stripe / Resend / Sentry / Upstash / Inngest | Set keys in the env file you use for verification (test keys OK for staging).                                                         |

---

## 2. Staging deploy smoke (manual)

After staging is deployed with **staging** secrets (Stripe test mode, staging DB, etc.):

1. **Sign in** — session works; optional: change password and confirm session still valid (`sessionVersion`).
2. **Commerce** — cart with real line items → full checkout → **`/checkout/pay/[orderId]`** → complete Stripe test payment.
3. **Stripe Dashboard** — webhook deliveries to **`/api/webhooks/stripe`** return **2xx**.
4. **Database** — order row **`paid`**, **`paidAt`** set.
5. **Inngest** — event **`order/paid`** received; function **`handle-order-paid`** ran (logs / dashboard).
6. **Email** (if Resend configured) — confirmation email received.

Capture screenshots or dashboard links for your release notes.

---

## 3. Fulfillment integration (after payments are trusted)

**`handleOrderPaid`** → **`fulfillment-integration`** calls **`dispatchPaidOrderFulfillment`** in **`lib/commerce/fulfillment-dispatch.ts`**.

- Set **`FULFILLMENT_WEBHOOK_URL`** (and optionally **`FULFILLMENT_WEBHOOK_SECRET`** for `Authorization: Bearer`) to POST JSON (`event: furnishes.order.paid`, order id/number, line items). Non-2xx fails the Inngest step (retries).
- If the URL is unset, the step logs **`commerce.fulfillment.stub`** and a Sentry breadcrumb — no outbound call.

Keep idempotency: **`mark-processing`** still uses `updateMany` where `status: "paid"` so duplicate `order/paid` events do not double-dispatch processing state.

Details: **`docs/COMMERCE_HARDENING_CHECKLIST.md`** (Phase 2).

---

## 4. Optional ESLint / `next/image` polish

**Phase 5** in **`docs/COMMERCE_HARDENING_CHECKLIST.md`**: **`ProfileContent`** uses **`next/image`** for allowlisted OAuth avatar hosts — see **`lib/site/oauth-avatar-image.ts`**.
