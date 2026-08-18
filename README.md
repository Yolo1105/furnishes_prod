# Furnishes

Single Next.js application. Ships **Landing** and a protected **Account**
surface (Product-free), including Image Generation and an Inspiration Board.
Approved designs are frozen under `reference/`.

All rules live in one place: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Plan: [`docs/ROADMAP.md`](docs/ROADMAP.md). Phase 2 notes:
[`docs/PHASE_2_PROGRESS.md`](docs/PHASE_2_PROGRESS.md). Creative workspace:
[`docs/IMAGE_GENERATION.md`](docs/IMAGE_GENERATION.md),
[`docs/INSPIRATION_BOARD.md`](docs/INSPIRATION_BOARD.md),
[`docs/CHAT_PERSONAS_AND_PREFERENCES.md`](docs/CHAT_PERSONAS_AND_PREFERENCES.md).
Database: [`docs/DATABASE.md`](docs/DATABASE.md).
Deploy / ops: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md),
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).

## Requirements

- Node **24.13.0** (`.nvmrc` / `.node-version`)
- pnpm **9.15.9** via Corepack
- Docker (local PostgreSQL via `docker compose`)

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile
cp .env.example .env   # set DATABASE_URL + AUTH_SECRET
docker compose up -d
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

Default local `DATABASE_URL`:

```text
postgresql://furnishes:furnishes@127.0.0.1:5433/furnishes?schema=public
```

E2E uses the isolated `furnishes_e2e` database (created by compose init).
Local compose maps Postgres to host port **5433** so it can run beside other
instances on 5432.

## Commands

| Command                             | Description                         |
| ----------------------------------- | ----------------------------------- |
| `pnpm dev`                          | Run the app (http://localhost:3000) |
| `pnpm build` / `pnpm start`         | Production build / serve            |
| `pnpm typecheck`                    | `tsc --noEmit`                      |
| `pnpm lint`                         | ESLint                              |
| `pnpm test`                         | Vitest unit tests                   |
| `pnpm test:e2e`                     | Migrate, seed, build, Playwright    |
| `pnpm test:e2e:account:core`        | Core Account Playwright suite       |
| `pnpm test:e2e:account:chat-memory` | Personas + preference memory E2E    |
| `pnpm test:e2e:account:creative`    | Image Gen + Inspiration Playwright  |
| `pnpm test:e2e:landing`             | Landing + routes Playwright         |
| `pnpm db:up` / `pnpm db:down`       | Start/stop local Postgres           |
| `pnpm db:migrate` / `pnpm db:seed`  | Apply migrations / seed             |
| `pnpm db:reset`                     | Reset DB (destructive)              |
| `pnpm db:backup`                    | Dump local compose Postgres         |
| `pnpm auth:purge-retention`         | Purge aged auth/audit rows          |
| `pnpm knip`                         | Dead code / unused export check     |
| `pnpm check:reference-integrity`    | Verify frozen design hashes         |
| `pnpm check:account-architecture`   | Account architecture invariants     |
| `pnpm check`                        | Everything CI runs                  |

## Auth smoke

Seeded E2E users (via `pnpm test:e2e`): `owner@example.com` /
`stranger@example.com`, password `password1234`.
