# Seed-readiness docs

| Doc                                                                    | Phase | Summary                                      |
| ---------------------------------------------------------------------- | ----- | -------------------------------------------- |
| [01-lint-cleanup.md](./01-lint-cleanup.md)                             | 1.1   | ESLint override scope (eva-dashboard only)   |
| [01-e2e-setup.md](./01-e2e-setup.md)                                   | 1.2   | Playwright, CI secrets, `ALLOW_TEST_HELPERS` |
| [01-stripe-webhook-idempotency.md](./01-stripe-webhook-idempotency.md) | 1.3   | `ProcessedStripeEvent` dedupe                |
| [02-production-guards.md](./02-production-guards.md)                   | 2     | Boot guards + `verify:prod` safety           |
| [03-verification.md](./03-verification.md)                             | 3     | Staging verification runbook                 |
| [04-post-launch-hardening.md](./04-post-launch-hardening.md)           | 4     | ADR-0011 + optional backlog                  |
| [05-next-steps.md](./05-next-steps.md)                                 | 5     | Ops closure, Phase 6 product, maintenance    |

Runbooks: **`docs/VERIFY_ENV_AND_STAGING.md`** · commerce checklist: **`docs/COMMERCE_HARDENING_CHECKLIST.md`** · ADRs: **`docs/adr/`**.
