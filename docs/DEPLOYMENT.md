# Deployment (Phase 6)

How to run Furnishes in a production-like environment. Provider credentials,
storage, and chat rollout remain env-driven — see
`docs/PRODUCTION_PROVIDERS.md`, `docs/CHAT_ROLLOUT.md`,
`docs/ROLLOUT_PLAN.md`, and `docs/ACCOUNT_HARDENING.md`.

## Pre-flight checklist

- [ ] `AUTH_SECRET` ≥ 32 characters
- [ ] `DATABASE_URL` points at managed Postgres (not local compose in prod)
- [ ] `APP_ORIGIN` is the public HTTPS origin
- [ ] `AUTH_COOKIE_SECURE=1` (or rely on https `APP_ORIGIN`)
- [ ] `STORAGE_PROVIDER=s3` with bucket/keys (required for multi-instance)
- [ ] `SMTP_HOST` set — boot preflight fails without it, because the log-only
      adapter reports success while no verification/reset mail is delivered
- [ ] `CHAT_PROVIDER` / image provider set intentionally (defaults are safe/local)
- [ ] Never ship `CHAT_RENDERS_ENABLED=1` with `IMAGE_RESTYLE_PROVIDER=disabled`
      (boot preflight fails closed)
- [ ] If `CHAT_RAG_ENABLED=1`, `DesignDoc` rows seeded (`SEED_RAG=1 pnpm db:seed:rag`)
- [ ] Capability stages follow `docs/ROLLOUT_PLAN.md`
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING=1` only when SEO should be on
- [ ] `ALLOW_DEMO_SIGNIN=0` in production
- [ ] `NEXT_PUBLIC_E2E` unset in real production (preflight errors if it is on
      against a non-localhost `APP_ORIGIN`)
- [ ] `TRUSTED_PROXY_HOPS` matches the number of reverse proxies that append
      `x-forwarded-for` (default 1)
- [ ] Backup + restore rehearsal recorded (`docs/OPERATIONS.md`)
- [ ] Security headers present on responses (owned by `next.config.ts` —
      CSP, frame deny, nosniff, referrer-policy, permissions-policy; HSTS in
      production). Reverse proxies must not strip them.

Optional labels for readiness/ops logs:

```bash
APP_VERSION=1.0.0
GIT_COMMIT=<sha>
```

Validate the whole env before deploying — same checks the app runs at boot:

```bash
pnpm check:prod-config .env.production
```

## Staged production env

`.env.example` is the full catalog with safe local defaults. These are the values
that must change for a real deployment, grouped by layer so each one can be
verified before the next is enabled.

These layers are about **bringing infrastructure up**. They are not the numbered
stages in `docs/ROLLOUT_PLAN.md`, which govern cohort percentages and capability
flags once chat is already live — that document owns rollout, this one owns
standing the environment up.

```bash
# Layer 1 — infrastructure
DATABASE_URL=postgresql://...        # managed Postgres
DIRECT_URL=postgresql://...          # only if the app connects via a pooler

# Layer 2 — login (preflight fails without these)
AUTH_SECRET=<32+ random chars>
APP_ORIGIN=https://<domain>
AUTH_COOKIE_SECURE=1
ALLOW_DEMO_SIGNIN=0                  # NEXT_PUBLIC_ALLOW_DEMO_SIGNIN must be unset at build
SMTP_HOST=<host>                     # required in production; unset = mail is only logged
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>
EMAIL_FROM="Furnishes <noreply@<domain>>"

# Layer 3 — uploads (required for more than one instance)
STORAGE_PROVIDER=s3
STORAGE_S3_BUCKET=<bucket>
STORAGE_S3_REGION=<region>
STORAGE_S3_ACCESS_KEY_ID=<key>
STORAGE_S3_SECRET_ACCESS_KEY=<secret>
# STORAGE_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com

# Layer 4 — chat (start with an allowlist, then raise the percentage)
CHAT_PROVIDER=openai
OPENAI_API_KEY=<key>
CHAT_MODEL_PRIMARY=<model>
CHAT_ROLLOUT_ALLOWLIST=<user ids>
CHAT_ROLLOUT_PERCENT=0
CHAT_SESSION_COST_LIMIT_USD=2
CHAT_USER_DAILY_COST_LIMIT_USD=5
CHAT_GLOBAL_DAILY_COST_LIMIT_USD=100   # the only ceiling on total spend

# Layer 5 — image generation
IMAGE_GENERATION_PROVIDER=http
IMAGE_GENERATION_API_URL=<url>
IMAGE_GENERATION_API_KEY=<key>
IMAGE_GENERATION_MODEL=<model>
# Renders last, and only together:
# CHAT_RENDERS_ENABLED=1
# IMAGE_RESTYLE_PROVIDER=http

# Layer 6 — commerce (docs/COMMERCE.md). Leave off until there is real stock:
# the storefront is hidden entirely while COMMERCE_ENABLED=0.
COMMERCE_ENABLED=1
COMMERCE_PAYMENT_PROVIDER=stripe   # `test` settles for free; preflight blocks it
STRIPE_SECRET_KEY=<key>
STRIPE_WEBHOOK_SECRET=<whsec>      # without it, orders never leave pending_payment
COMMERCE_TAX_PERCENT=9             # 0 omits the tax line entirely
COMMERCE_TAX_LABEL=GST
COMMERCE_SHIPPING_FLAT_CENTS=2000

# Layer 6 — SEO, once the surface is ready (build-time)
NEXT_PUBLIC_ALLOW_INDEXING=1
```

`NEXT_PUBLIC_*` values are inlined at build time — changing them needs a rebuild,
not a restart. Seed the RAG corpus (`SEED_RAG=1 pnpm db:seed:rag`) before setting
`CHAT_RAG_ENABLED=1`; preflight only warns on an empty corpus.

## Node host (no container)

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile
pnpm exec prisma migrate deploy
pnpm build
pnpm start --hostname 0.0.0.0 --port 3000
```

`next.config.ts` sets `output: "standalone"`. After `pnpm build` you can also:

```bash
node .next/standalone/server.js
```

(copy `.next/static` and `public` beside the standalone output as Next documents).

## Docker image

```bash
docker build -t furnishes:local .
docker run --rm -p 3000:3000 --env-file .env.production furnishes:local
```

The image CMD is `node server.js` only — it does **not** apply migrations. Run
`prisma migrate deploy` as a separate one-shot job against the same image before
the app rolls out:

```bash
docker run --rm --env-file .env.production furnishes:local \
  node_modules/.bin/prisma migrate deploy
```

If the app connects through a pooler (Neon/PgBouncer), point migrations at the
direct endpoint instead. `DIRECT_URL` is not read by `prisma/schema.prisma`; it
is consumed by the migrate command:

```bash
pnpm db:migrate:pooled   # DATABASE_URL="$DIRECT_URL" prisma migrate deploy
```

Health probes:

| Probe     | URL                       | Expect                          |
| --------- | ------------------------- | ------------------------------- |
| Liveness  | `GET /api/health`         | 200 `{ status: "ok" }`          |
| Readiness | `GET /api/health?ready=1` | 200 when DB reachable; else 503 |

Set the platform `terminationGracePeriodSeconds` (or equivalent) longer than
`CHAT_REQUEST_TIMEOUT_MS` so SSE chat turns can finish. The Node process
disconnects Prisma on `SIGTERM`.

Prisma opens `num_cpus * 2 + 1` connections **per instance** unless
`DATABASE_URL` includes `connection_limit`. Size so
`(instances × connection_limit)` stays under Postgres `max_connections`. Behind
PgBouncer, keep the app on the pooled URL and run migrations with `DIRECT_URL`.

## Horizontal scale

| Concern              | Requirement                                                           |
| -------------------- | --------------------------------------------------------------------- |
| Uploads / gen assets | `STORAGE_PROVIDER=s3` (local `.data/uploads` is single-instance only) |
| Sessions             | DB-backed digests — safe across instances                             |
| Auth rate limits     | DB-backed (`AuthRateLimit`) — safe across instances                   |
| Chat quotas          | DB-backed counts — safe across instances                              |
| Sticky sessions      | Not required                                                          |

## Rollback

1. Redeploy the previous image / git SHA.
2. Provider rollbacks are env-only (chat → `local`, storage → temporary local only if single-instance emergency).
3. Do not reverse Prisma migrations casually — forward-fix or restore from backup.

## Related

- Day-2 ops: `docs/OPERATIONS.md`
- Chat cohort rollout: `docs/CHAT_ROLLOUT.md`
- Database backup notes: `docs/DATABASE.md`
