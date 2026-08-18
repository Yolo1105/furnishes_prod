# Reuse and defer decisions

A clear separation of what we keep as ideas, what we may inspect later, what must
never be copied directly, and what is explicitly deferred.

## Ideas to retain (patterns, not code)

- Pinned Node 24 / pnpm 9.15.9 toolchain and exact version pinning.
- Strict TypeScript, ESLint flat config, Prettier. (Git hooks and commitlint were deliberately dropped in this repo; CI is the enforcement gate.)
- Vitest + Playwright test strategy.
- Repo guard scripts (generalized here into boundary + Phase 0 scope gates).
- `AGENTS.md` + Cursor rules for durable constraints.
- Env-by-key-name discipline (`.env.example` with names only).

## Code to inspect later (never auto-copy)

- Legacy Prisma schema/migrations as a **reference** for future data modeling.
- Legacy API route handlers as a **behavioral spec** for future endpoints.
- Legacy auth, Stripe, uploads, and Eva orchestration as behavior to re-derive.
- Legacy backend test suites as an inventory of expected behavior.

## Forbidden from direct copying (until the owning phase ports them)

- The old frontend (`app/`, `components/`, `lib/`, `contexts/`, `hooks/`).
- The old Prisma schema and migrations.
- API route implementations.
- Auth, Stripe, AI, storage, email, Redis, Sentry, or database code.
- The old dependency list wholesale (Tailwind, Radix, and the full stack).
- Any external service connection.

## Explicitly deferred domains

Waitlist, cart, projects/collaboration, conversations/messages, Eva/orchestration,
studio/generation, notifications, profile/account data, shortlist, sharing,
fulfillment/Inngest, admin, and support. See `production-domain-map.md` for the
full disposition table. Each future port requires a logged entry in docs/ARCHITECTURE.md.

## Visual/system decisions to avoid

- Do not adopt one global styling system (Tailwind/Radix/token file) up front.
- Do not build generic public chrome or an Account shell before parity.
- Do not normalize Landing/Products/Account into one visual language.
