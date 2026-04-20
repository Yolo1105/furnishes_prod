> **Historical migration doc:** Describes Phase 2 as executed during an early **SQLite-based** Eva schema rollout. **Current runtime** is **PostgreSQL** — see [`docs/CURRENT_RUNTIME_TRUTH.md`](../CURRENT_RUNTIME_TRUTH.md).

# Phase 2 — Database foundation (done)

## Current state (today)

The merged app uses **`postgresql`** in `prisma/schema.prisma`. Local and deployed **`DATABASE_URL`** values should match that provider. Treat the sections below as **history** of how the SQLite-first slice landed, not as instructions to run SQLite today unless you are intentionally working on an old branch or reproducing a legacy environment.

## What changed (historical — SQLite-first rollout)

- **`prisma/schema.prisma`** — At this phase, the Eva schema was introduced as **SQLite**: `User`, `Conversation`, `Message`, `Preference`, `PreferenceChange`, `File`, `CostLog`, `SharedProject`, `DesignDoc`, `CalibrationLog`, `RateLimitEvent`, `Playbook`, NextAuth tables (`Account`, `Session`, `VerificationToken`), `MessageFeedback`.
- **`prisma/migrations/20260413162325_eva_sqlite_init/`** — Initial SQL migration for SQLite (`file:./prisma/dev.db` in docs of that era).
- **`prisma/seed.ts`** — Demo + admin users and sample conversation (requires DB + `bcrypt`).
- **Scripts:** `db:migrate`, `db:migrate:deploy`, `db:migrate:create-only`, `db:status`, `db:seed:dev` (`prisma db seed`; `db:seed` is a safety alias that exits with an error), `db:seed:rag` / `db:seed:rag:embed`.
- **`prisma.config.ts`** — Schema path, migrations directory, and seed command; loads `.env` then `.env.local` (override) via `dotenv` (replaces deprecated `package.json#prisma`).
- **`.env.example`** — May still document sample URLs; follow **`README.md`** and **`docs/VERIFY_ENV_AND_STAGING.md`** for the **current** `DATABASE_URL` shape (PostgreSQL).

Phase 1’s **SQLite-only** placeholder (`EvaHealthCheck`) is **removed** (historical note).

## Local setup (historical — optional SQLite dev)

This reflected **normal practice during the SQLite phase**; the **current** standard is PostgreSQL per the files linked in the banner above.

1. **`.env.local`** with a **`file:`** SQLite URL was typical for that period.
2. **`npm run db:migrate:deploy`** — applies `prisma/migrations` from that era.
3. **`npm run db:seed:dev`** — demo users (`demo@example.com`, `admin@example.com`). Run `npm run db:seed:dev` and copy the generated passwords printed to the console.

Moving from SQLite to PostgreSQL was a **separate migration project** (provider change, migration baseline, hosting).

## CI / production

- Set **`DATABASE_URL`** on the host (today: PostgreSQL).
- Run **`npm run db:migrate:deploy`** before or during deploy (per your pipeline).
- `npm run build` only runs **`prisma generate`**; it does not require a live DB connection.

## Prisma config

Seed and migration paths live in **`prisma.config.ts`** so Prisma 6+ does not rely on deprecated `package.json#prisma`. CI sets a placeholder **`DATABASE_URL`** for builds; local dev uses `.env.local`.

## Finishing the Eva / chatbot_v3 integration (database) — historical framing

**At the time of the SQLite-first migration:** the schema was expressed by **`prisma/migrations/20260413162325_eva_sqlite_init/`** (SQLite).

**After PostgreSQL became the active provider:** migration history and deploy steps follow the **current** `prisma/schema.prisma` and migration directory on `main`; use Prisma’s docs for **Postgres** baselines and `db:migrate:deploy` if you are reconciling an existing database.

Use **`npm run db:migrate:create-only`** only **after** you change **`schema.prisma`** again; it is not required to “complete” the chatbot integration.

If **`db:migrate:deploy`** errors because the DB already had tables created outside Prisma, resolve with Prisma’s baseline/resolve flow for your situation (avoid duplicate DDL on production).
