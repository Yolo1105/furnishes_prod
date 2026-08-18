# Roadmap

The end goal: the old production repo's capabilities, rebuilt behind the new
approved UI, in this cleaner codebase. The legacy repo is the behavioral
spec (`docs/legacy/production-domain-map.md` inventories every domain);
`reference/` is the visual spec. Each phase ports one slice: behavior
re-derived from legacy, UI built from the approved designs, dependencies
unblocked in `eslint.config.mjs` and logged in `docs/ARCHITECTURE.md`.

## Phase 0 — Clean baseline ✅ (this state)

Single-app repo re-baselined from the July 2026 rebuild. Pinned toolchain,
CI gates (build, typecheck, lint, unit tests, knip, format, reference
integrity), frozen designs (`landing.jsx`, `account.jsx` @ 2026-07-16),
legacy behavioral maps carried over, Products fully removed, governance
collapsed into one architecture doc.

## Phase 1 — Landing ✅ (carried over, signed off)

Production Landing at `/`: Three.js hero, loader, damped scroll, menu,
waitlist demo states, cookie consent. Unit + Playwright coverage included.
The approved menu includes “Product” as a work category; it navigates to
the general Work section (no Product surface or domain identifier).
Optional Phase 1 polish, non-blocking: split the two large modules
(`createLandingHeroScene.ts` ~2.4k lines, `landing.module.css` ~2.6k lines)
into scene/lifecycle and per-section files.

## Phase 2 — Auth + Account ✅ (integrated) · architecture refactor ✅

Credential auth with digest-only sessions, protected Account shell, and
Product-free Account routes (dashboard, style, budget, privacy, conversations,
chat, projects, uploads, settings, help, image generation, inspiration
board). Persistence via Prisma + PostgreSQL. Visual direction from the Account
reference.

**Architecture refactor (no design changes):** complete. Studio prototype
removed; every `/account/*` route owns React paint through `AccountShell`.
See `docs/ACCOUNT_ARCHITECTURE_REFACTOR.md`. Visual regression:
`pnpm test:e2e:account:visual`. Architecture guard:
`pnpm check:account-architecture`.

Commerce UI (orders / billing / cart / checkout) shipped this phase as static
React ports without backend APIs; Phase 6 replaced them with real services.
Image Generation uses provider adapters with private asset storage. Inspiration
Board replaces the reference Shortlist without commerce metadata.

Deferred honestly: live vendor credentials for SMTP/S3/image HTTP in
production environments, MFA/passkeys. Adapters for mail,
storage, waitlist, chat streaming, and OpenAI are wired — see Phases 3–4.

## Phase 3 — Production providers and storage ✅

SMTP (nodemailer when configured), S3-compatible private storage factory,
waitlist persistence (`POST /api/waitlist`), and HTTP image provider tests.
Local adapters remain the default. See `docs/PRODUCTION_PROVIDERS.md`.

## Phase 4 — Chat streaming and assistant hardening ✅ (streaming + Stop)

SSE streaming on message send (`stream: true`), same-slot Send→Stop composer
swap, partial replies kept as `status=stopped`, provider `stream()` adapters
for local + OpenAI. See `docs/CHAT_BACKEND_INTEGRATION.md`. Further optional
work: richer orchestration, upstream cancel hardening — without reintroducing
legacy playbooks/Product recommendations unless explicitly approved.

## Phase 5 — Account hardening ✅

Stronger configurable auth rate limits (IP + account keys), shared
`SecurityEvent` audit helper, retention purge (`pnpm auth:purge-retention`),
real active-session list + targeted revoke, password change API, and new
sign-in emails when `emailSecurity` is on. MFA/passkeys and multi-member
collaboration remain deferred. See `docs/ACCOUNT_HARDENING.md`.

## Phase 6 — Deployment and operations ✅

Standalone Next output + production Dockerfile, readiness health
(`GET /api/health?ready=1`), structured `[ops]` logs, Postgres backup script
(`pnpm db:backup`), and day-2 runbooks. See `docs/DEPLOYMENT.md` and
`docs/OPERATIONS.md`. Sentry/APM remains deferred until explicitly wired.

## Phase 7 — Commerce ✅ (first pass)

Catalog, cart, checkout, payments, and orders shipped 2026-08-14 behind
`COMMERCE_ENABLED=0` (decision recorded 2026-08-13, reversing the earlier
"deliberately not planned" stance). Multi-currency priced per market, a payment
adapter of `disabled` / `test` / `stripe`, and a signature-verified webhook with
replay protection. `stripe` / `@stripe/*` remain lint-blocked and uninstalled —
the integration is REST plus `node:crypto`.

Known gaps are listed in `docs/COMMERCE.md`, the load-bearing ones being no
Stripe card-confirmation UI yet and placeholder shipping and tax. Orders are
retained (shipping PII anonymized) on account deletion. Scope and money rules
live in `docs/COMMERCE.md`.

The planning side already shipped and is the intended foundation: `RoomPlan` /
`RoomPlanItem` with integer-cent budgeting and the orderable readiness score.

## Deliberately not planned

Fulfillment orchestration (Inngest) and an internal admin surface. Neither is
required by the commerce phase as scoped.

## Rules that keep this honest

- A phase may only introduce dependencies it uses now; the lint blocklist
  shrinks per phase, never preemptively.
- Legacy code is read for behavior and rewritten; it is never pasted.
- Every ported domain gets a one-paragraph entry in ARCHITECTURE.md naming
  the legacy routes/models it re-derives.
- knip + `pnpm check` stay green after every phase.
