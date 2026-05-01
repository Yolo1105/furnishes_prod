# Phase 1.3 — Stripe webhook idempotency

## Behavior

- After signature verification, the handler inserts a `ProcessedStripeEvent` row keyed by Stripe’s `evt_...` id.
- **P2002** (unique violation) means a prior delivery already recorded this event → respond **200** immediately.
- If the business handler throws after the insert, the dedup row is **deleted** so Stripe retries can run the handler again.

## Tests

See `__tests__/api/stripe-webhook.test.ts` for duplicate delivery and rollback coverage.
