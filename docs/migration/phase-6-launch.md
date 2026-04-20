> **Historical migration doc:** This checklist was written during the Eva integration and updated across database eras. It is **not** the single source of truth for “what runs in this repo today.”
>
> **Current runtime:** [`docs/CURRENT_RUNTIME_TRUTH.md`](../CURRENT_RUNTIME_TRUTH.md) (canonical pointers to README, env verification, and `prisma/schema.prisma`).

# Phase 6 — Launch hardening (historical checklist)

**Scope:** Move Eva from “integrated in repo” to **reliable in staging/production**, aligned with Phase 0 **Milestone B** extras as needed.

## 6.1 — Database and migrations

**Current standard (today):** The app targets **PostgreSQL**. `prisma/schema.prisma` uses `provider = "postgresql"`; **`DATABASE_URL`** must be a **`postgresql://…`** (or compatible) connection string for real environments. Run **`npm run db:migrate:deploy`** in the deploy pipeline **before** the app process starts, and smoke-test **`npm run db:status`** after deploy.

**Historical note — SQLite era:** An earlier integration phase shipped **SQLite** (`provider = "sqlite"`, `DATABASE_URL=file:…`, SQLite DDL under `prisma/migrations/`). That layout was appropriate for that period but is **archived context**, not current production truth. If you read older branches or tickets that say “`DATABASE_URL` must be `file:`,” treat that as **historical** unless you have confirmed the project is still on that stack.

## 6.1b — API auth (optional NextAuth middleware)

Root **`middleware.ts`** is **opt-in**. By default, Eva API routes (`/api/chat`, `/api/extract`, etc.) do **not** require a session (anonymous chat works). Set:

- **`EVA_REQUIRE_API_AUTH=true`** (or `1` / `yes`) to require a NextAuth session for `/api/*`, except **`/api/auth/*`**, **`/api/health`**, **`/api/eva/health`**, and **`/api/config`**.

When enabled, unauthenticated API calls redirect to sign-in — align this with product (login-required chat vs anonymous + cost caps).

## 6.2 — Secrets and LLM

- [ ] **`OPENAI_API_KEY`** (or **`OPENROUTER_API_KEY`**) in production env.
- [ ] **`NEXTAUTH_SECRET`** and **`NEXTAUTH_URL`** set for production (see `lib/eva/core/env.ts` — secret required when `NODE_ENV=production`).
- [ ] Optional: **`ADMIN_STATS_SECRET`** for bearer access to `/api/admin/stats`.

## 6.3 — RAG (design knowledge in chat)

`lib/eva/rag/retriever.ts` reads **`DesignDoc`** rows with embeddings. If the table is empty, chat still works but **without** retrieved chunks.

- [ ] One-time (per environment): **`npm run db:seed:rag:embed`** after `OPENAI_API_KEY` is set (opt-in; costs embedding usage).
- [ ] Confirm **`config/design-docs/*.md`** are the canonical copy (already aligned with chatbot_v3).

## 6.4 — Observability

- [ ] Optional: **`NEXT_PUBLIC_SENTRY_DSN`** (+ org/project/auth token for source maps in CI) — see root `sentry.*.config.ts` and `instrumentation.ts`.

## 6.5 — Milestone B (Phase 0) — ship when ready

Pick what the first public release needs:

| Feature                    | API / surface                                                      |
| -------------------------- | ------------------------------------------------------------------ |
| Uploads                    | `/api/upload`, `/api/uploads/[id]`, files views                    |
| Insights / recommendations | `/api/conversations/[id]/insights`, `.../recommendations`          |
| Export + share             | `/api/conversations/[id]/export`, `.../share`, `/shared/[shareId]` |
| Playbook                   | `/api/playbook`, playbook view                                     |
| Admin                      | `/api/admin/stats`                                                 |

Most routes already exist; work here is **QA**, **auth rules**, and **product sign-off** — not greenfield implementation.

## 6.6 — Smoke test (manual)

1. `/inspiration` → AI Assistant → `/chatbot`
2. New chat → message → streaming
3. Preferences / extract → confirm or reject if shown
4. Optional: upload, recommendations, export, share link in private window
5. `/api/health`, `/api/eva/health`

## Done criteria

Phase 6 is “done” when staging (or production) runs the full vertical slice with **migrations applied**, **secrets set**, and **smoke tests** passed; RAG and Sentry are optional but recommended before broad traffic.
