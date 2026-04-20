# furnishes_prod

Minimal app shell: **Next.js** (App Router), **React**, **TypeScript**, **Tailwind CSS v4**.

## Commands

### Development

```bash
npm install
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Quality (same order as CI)

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run build
```

### Formatting

```bash
npm run format        # write
npm run format:check  # check only
```

### Git hooks (after `npm install`)

**Husky** runs **lint-staged** on pre-commit: **ESLint --fix** + **Prettier** on staged `*.{ts,tsx,js,jsx,mjs,cjs}`; **Prettier** on staged `*.{json,css,md,yml,yaml}`. No full test suite on commit (keeps commits fast). CI remains the full check.

To skip hooks once (e.g. emergency): `git commit --no-verify` (use sparingly).

### Bundle analysis

Webpack build with `@next/bundle-analyzer` (reports under `.next/analyze/*.html`). Default `npm run build` uses Turbopack and does not emit these files.

```bash
npm run analyze
```

## Stack (pinned in `package.json`)

- Node.js **24.x** (`engines` in `package.json`, **`.nvmrc`** for nvm / fnm)
- Next.js 16.x
- React 19.x
- TypeScript 5.x
- Tailwind CSS v4 (`@import "tailwindcss"`, `@tailwindcss/postcss`)

**Eva (assistant):** Prisma + **PostgreSQL** (`schema.prisma` datasource), App Router APIs under `app/api/`, NextAuth, optional Sentry (`NEXT_PUBLIC_SENTRY_DSN`), and the full dashboard at **`/chatbot`** (`app/(chromeless)/chatbot/`). Local dev needs a running Postgres and **`DATABASE_URL`** in **`.env.local`** (see **`.env.example`**), then **`npm run db:migrate:deploy`** and **`npm run db:seed:dev`**. Use **`npm run db:migrate:create-only`** when **`schema.prisma`** changes. Design-doc embeddings (RAG): **`npm run db:seed:rag:embed`** when **`OPENAI_API_KEY`** is set. Marketing pages remain separate under **`app/(site)/`**. Archived SQLite migrations live under **`prisma/migrations_sqlite_archived/`** — the active schema is PostgreSQL-only.

## Where to put new code

- **Site / marketing UI:** `components/site/`, `lib/site/`, `hooks/site/`, `content/site/`.
- **Eva server + domain:** `lib/eva/`, `app/api/`.
- **Eva dashboard UI:** `components/eva-dashboard/`, `lib/eva-dashboard/`.
- **Style Explorer quiz:** `components/quiz/`, `lib/quiz-data/` (barrel `lib/quiz-data.ts`).

File naming is mixed (PascalCase vs kebab-case) historically; match the folder you edit.

### Static assets

Large marketing images live under `public/images/`. After adding or updating them, run **`npm run images:optimize`** (requires **`sharp`**) to cap width and re-encode; commit the smaller outputs.

### Environment variables

Copy **`.env.example`** → **`.env.local`** when you add secrets. Register each variable you rely on for **site** behavior in **`lib/site/env.ts`** (Zod). Eva-specific secrets are validated in **`lib/eva/core/env.ts`** where strict checks are required.

**Prisma CLI:** **`prisma.config.ts`** defines the schema, migrations path, and seed command (replacing `package.json#prisma`). It loads **`.env`** then **`.env.local`** (with override) via **`dotenv`**. If you pass **`DATABASE_URL`** on the command line, that value wins over **`.env.local`** for that command.

### Database (PostgreSQL — required)

The active **`prisma/schema.prisma`** uses **`provider = "postgresql"`**. Eva chat, conversations, preferences, and rate/cost accounting all persist via Prisma — this is **not** a mock or in-memory prototype.

1. Run **PostgreSQL** locally (Docker, Postgres.app, WSL, etc.) or use a hosted dev instance (Neon, Supabase, etc.).
2. Set **`DATABASE_URL="postgresql://…"`** in **`.env.local`** (copy from **`.env.example`**).
3. **`npm run db:migrate:deploy`** then **`npm run db:seed:dev`**.
4. Set **`OPENAI_API_KEY`** (or OpenRouter keys per **`.env.example`**) so **`POST /api/chat`** can stream.

**Production / Vercel:** use a managed **PostgreSQL** URL; serverless hosts must not rely on a local `file:` database.

**Troubleshooting**

- **`DATABASE_URL` missing / “not PostgreSQL”:** URL must start with **`postgresql://`** or **`postgres://`** and match **`schema.prisma`**.
- **`P1001`:** host unreachable — check URL, firewall, VPN, `sslmode` if required by the provider.
- **Chat returns errors in UI:** confirm DB migrations applied, **`OPENAI_API_KEY`** set, and browser requests include cookies (**`credentials: 'include'`** on the client — already set for the streaming chat fetch and API helpers).
- **Migration state:** **`npm run db:status`** (wraps `prisma migrate status`).

### Eva migration phases

See **`docs/migration/README.md`** for the full phase index. **Current step:** [Phase 6 — launch hardening](docs/migration/phase-6-launch.md) (deploy, secrets, optional RAG seed, smoke tests).

### Bundle sizes (baseline)

Run **`npm run analyze`** locally, open **`.next/analyze/client.html`**, and note **First Load JS** for key routes in **`REMEDIATION_NOTES.md`** when you need before/after proof (Next 16 CLI does not print per-route kB).
