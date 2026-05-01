# Phase 1.2 — Playwright E2E

## GitHub Actions

The **`e2e`** job runs only when **`STRIPE_TEST_SECRET_KEY`**, **`STRIPE_TEST_PUBLISHABLE_KEY`**, and **`STRIPE_TEST_WEBHOOK_SECRET`** are all set (fork PRs and repos without secrets skip E2E).

## GitHub Actions secrets

Configure in **Settings → Secrets and variables → Actions**:

| Secret                        | Purpose                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `STRIPE_TEST_SECRET_KEY`      | Stripe test mode secret API key                                                     |
| `STRIPE_TEST_PUBLISHABLE_KEY` | Stripe test publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in job)           |
| `STRIPE_TEST_WEBHOOK_SECRET`  | Test webhook signing secret (required for client; use dashboard or `stripe listen`) |

## Local run

1. PostgreSQL running; `DATABASE_URL` in `.env.local`
2. `npx prisma migrate deploy` and `npx prisma db seed` (optional)
3. Set `ALLOW_TEST_HELPERS=1` in `.env.local`
4. Stripe test keys and `COMMERCE_BACKEND_ENABLED=1`, `NEXT_PUBLIC_COMMERCE_ENABLED=1`
5. `npm run build && npm run start` **or** `E2E_SKIP_WEBSERVER=1 npm run dev` in one terminal
6. `npm run test:e2e`

## Test-only behavior

With `ALLOW_TEST_HELPERS=1`, successful signup responses include `x-test-verify-token` for the raw verification token (including when the app runs under `next start` / production `NODE_ENV`). Runtime boot guards block this on **`VERCEL_ENV=production`** / **`DEPLOYMENT_ENV=production`** — see **`docs/seed-readiness/02-production-guards.md`**.
