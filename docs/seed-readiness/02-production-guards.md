# Phase 2 — Production guards

## Runtime (deployed production only)

On **`VERCEL_ENV=production`** or **`DEPLOYMENT_ENV=production`** (self‑hosted), the app **refuses to start** if any of these are set:

- **`ALLOW_TEST_HELPERS=1`** — would expose raw signup verification tokens (`x-test-verify-token`).
- **`ALLOW_MOCK_AUTH=1`** — enables mock-auth cookie bypass.

Implementation: `lib/env/production-guards.ts` → `instrumentation.ts` (Node).

**Not** enforced for local `next start`, CI, or **Vercel preview** (`VERCEL_ENV=preview`), so E2E and staging flows keep working.

## verify:prod

`scripts/verify-prod.ts` **fails** the same flags when **`VERCEL_ENV=production`** or **`DEPLOYMENT_ENV=production`** is set in the environment you are verifying.

If you run with **`NODE_ENV=production`** but not on Vercel production (e.g. local `next start`), **`ALLOW_TEST_HELPERS`** only produces a **warning** so Playwright stays usable.

## Self‑hosted production

Set **`DEPLOYMENT_ENV=production`** on the production host so boot guards and `verify:prod` align with Vercel’s `VERCEL_ENV=production`.

## Verification

- `npm run typecheck` / `npm run test` — includes `__tests__/lib/env/production-guards.test.ts`
- Before release: `npm run verify:prod` with production-shaped env (see `docs/VERIFY_ENV_AND_STAGING.md`)

**Next:** Phase 3 — **`docs/seed-readiness/03-verification.md`** (staging smoke + checklist).
