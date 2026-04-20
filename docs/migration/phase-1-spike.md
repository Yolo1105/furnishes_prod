# Phase 1 — Dependency spike (done)

> **Note:** Phase 2 replaced the temporary SQLite `EvaHealthCheck` schema with the full Eva PostgreSQL model. Use `docs/migration/phase-2-database.md` for the current DB story.

**Goal:** Validate Prisma + App Router API + streaming primitive alongside existing Next/React/Tailwind, with a green `lint` / `typecheck` / `build`.

## Version matrix (frozen for Eva port baseline)

| Package               | Version           |
| --------------------- | ----------------- |
| `next`                | 16.2.2 (existing) |
| `react` / `react-dom` | 19.2.4 (existing) |
| `prisma` (dev)        | ^6.19.0           |
| `@prisma/client`      | ^6.19.0           |
| `ai`                  | ^6.0.105          |
| `@ai-sdk/openai`      | ^3.0.37           |

Upgrade to Prisma 7+ can wait until the full Eva schema port; follow [Prisma upgrade guide](https://pris.ly/d/major-version-upgrade).

## What was added

- **`prisma/schema.prisma`** — SQLite + `EvaHealthCheck` placeholder (replaced when Eva models land).
- **`lib/eva/db.ts`** — singleton `PrismaClient` for API routes.
- **`app/api/eva/ping`** — JSON, no DB.
- **`app/api/eva/health`** — `SELECT 1` via Prisma (503 if DB unavailable).
- **`app/api/eva/stream-ping`** — minimal `ReadableStream` (no API key).
- **`.env.example`** — `DATABASE_URL` for local SQLite.
- **Scripts:** `db:generate`, `db:push`, `db:studio`; **`build`** runs `prisma generate` first.

## Local setup

```bash
cp .env.example .env.local
npm run db:push
npm run dev
```

Check: `GET /api/eva/ping`, `GET /api/eva/health`, `GET /api/eva/stream-ping`.

## CI / deploy

- `prisma generate` does not require a live DB.
- Set **`DATABASE_URL`** in the host environment before routes that use Prisma will succeed at runtime.
