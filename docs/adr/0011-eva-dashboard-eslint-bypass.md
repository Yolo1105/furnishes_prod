# ADR-0011 — ESLint bypass for `eva-dashboard` reference UI

| Status | Accepted                                              |
| ------ | ----------------------------------------------------- |
| Date   | 2026-04-21                                            |
| Scope  | `components/eva-dashboard/**`, `lib/eva-dashboard/**` |

## Context

The Eva dashboard UI under `components/eva-dashboard/` and `lib/eva-dashboard/` is **upstream-synced reference code** (historically aligned with the `chatbot_v3` studio). It is imported largely **verbatim** so we can diff and pull updates without maintaining a long-lived fork.

That code was not written against this repo’s default Next.js + TypeScript ESLint profile. Bringing it to **zero violations** would require either:

- ongoing mechanical edits every upstream sync (high merge friction), or
- a maintained fork of the dashboard (dedicated ownership we do not have at seed stage).

Meanwhile, **all other application code** (auth, commerce, webhooks, site routes) **must** satisfy full lint rules—see `eslint.config.mjs` (single override block, scoped paths only).

## Decision

Keep **one** ESLint override block, **only** for:

- `components/eva-dashboard/**/*.{ts,tsx}`
- `lib/eva-dashboard/**/*.{ts,tsx}`

with relaxed rules for React hooks, unused vars, empty object types, and unescaped entities—matching what we already suppress today.

**Do not** add new directories to this block. New features ship under normal lint.

## Consequences

**Positive**

- Upstream imports stay tractable; seed-stage engineering stays focused on product paths.

**Negative**

- Bugs that full lint would catch in those folders must be caught by review and tests instead.

**Revisit when**

- We hire a dedicated dashboard owner, or upstream stops changing, or we replace the reference UI with first-party code—then delete the override and fix or replace the tree.

## References

- `eslint.config.mjs` — override definition
- `docs/seed-readiness/01-lint-cleanup.md` — Phase 1.1 context
