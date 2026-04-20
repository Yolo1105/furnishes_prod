# Current runtime truth

Authoritative snapshot of what this repository expects **today**. Use this when docs disagree.

## Canonical references

In order of precedence for runtime facts:

1. [`README.md`](../README.md)
2. [`docs/VERIFY_ENV_AND_STAGING.md`](VERIFY_ENV_AND_STAGING.md)
3. This file
4. [`prisma/schema.prisma`](../prisma/schema.prisma)

## Database

- **Active:** PostgreSQL (`provider = "postgresql"` in `prisma/schema.prisma`).
- **`DATABASE_URL`** must be a PostgreSQL connection string for normal development and deployment.

## Primary assistant

- The main assistant experience is the **chromeless** route **`/chatbot`** (full Eva workspace).

## Room planner

- A public route **`/room-planner`** exists as a **preview** page. The full spatial room planner is **not** treated as a launched, production-ready product surface yet. Public UI must not promote it as a finished 3D tool or primary “fix” path for room configuration.

## Account and commerce

- Some account, cart, checkout, and dashboard areas may still be **mock-backed** or **placeholder-backed** for UX and demos. Verify persistence before assuming production behavior.

## Historical migration docs

- Files under `docs/migration/` describe **past migration phases** (including a SQLite-based Eva integration era). They are history, not automatic current truth. Prefer **Canonical references** above.

## Product copy guardrails (Phase 1)

- Prefer factual capability statements over vague “coming soon” on cart, account, and settings.
- Do not point users at unfinished surfaces as the main remediation for core tasks (e.g. room configuration) when a live path exists (e.g. assistant).
