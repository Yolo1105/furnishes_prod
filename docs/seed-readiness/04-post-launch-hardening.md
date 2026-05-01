# Phase 4 — Post-launch hardening (engineering backlog)

This phase is **not** a single release gate. It collects optional follow-ups after seed-readiness Phases 1–3.

## Done in repo

- **ADR-0011** — **`docs/adr/0011-eva-dashboard-eslint-bypass.md`** (why `eva-dashboard` keeps a scoped ESLint override).

## Optional polish

- [x] **`ProfileContent` OAuth avatars** — **`next/image`** for allowlisted OAuth hosts; **`lib/site/oauth-avatar-image.ts`** + **`next.config.ts`** `remotePatterns`. See **`docs/COMMERCE_HARDENING_CHECKLIST.md`** Phase 5.

## Operational (still manual)

- Close **Phase 3** verification on **`docs/COMMERCE_HARDENING_CHECKLIST.md`** when staging smoke is complete (**`docs/VERIFY_ENV_AND_STAGING.md`** §2).

## Product (parallel)

- “Coming soon” surfaces — **Phase 6** in **`docs/COMMERCE_HARDENING_CHECKLIST.md`**; prioritize with product.

**After Phase 4:** **`docs/seed-readiness/05-next-steps.md`** (operational Phase 3 closure + Phase 6 + maintenance).
