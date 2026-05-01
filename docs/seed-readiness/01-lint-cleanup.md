# Phase 1.1 — ESLint bypass cleanup

## Before

- Two override blocks in `eslint.config.mjs`
- Second block listed many app paths (auth, payments, checkout, webhooks, commerce, etc.) with relaxed React/TS rules

## After

- One override block scoped to `components/eva-dashboard/**` and `lib/eva-dashboard/**` only (upstream-synced reference UI; see ADR-0011 in Phase 5.2)
- All other application code, including security-sensitive paths, uses the default Next.js + TypeScript ESLint rules

## Method

- Collapsed overrides per static analysis: security and commerce paths no longer need blanket suppressions
- Fixed newly surfaced violations (JSX apostrophes, `react-hooks/set-state-in-effect`, `@typescript-eslint/no-empty-object-type`, unused imports) instead of re-extending the override block

## Verification

- `npm run lint --max-warnings=0` — pass (2026-04-21)

## Follow-up

- [x] ADR-0011 — **`docs/adr/0011-eva-dashboard-eslint-bypass.md`**
