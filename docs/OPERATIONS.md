# Operations runbook (Phase 6)

Day-2 procedures for backups, retention, incidents, and credentials.
Keep user message content out of tickets and logs.

## Health

```bash
curl -sS "$APP_ORIGIN/api/health"
curl -sS "$APP_ORIGIN/api/health?ready=1"
```

Structured boot and failure lines are prefixed `[ops]` (JSON). Chat cost /
failure lines remain `[chat-ops]` (`docs/CHAT_ROLLOUT.md`).

## Backups

### Local compose

```bash
pnpm db:up
pnpm db:backup                 # → backups/furnishes-<stamp>.sql
pnpm db:backup -- --db furnishes_e2e
```

### Managed Postgres

Use the provider’s automated backups **and** a periodic logical dump:

```bash
pg_dump "$DATABASE_URL" --no-owner --no-acl -f "furnishes-$(date -u +%Y%m%dT%H%M%SZ).sql"
```

### Restore rehearsal (scratch DB)

```bash
createdb furnishes_restore
psql furnishes_restore < backups/furnishes-….sql
psql furnishes_restore -c 'SELECT count(*) FROM "User";'
dropdb furnishes_restore
```

Record date, operator, and dump size after each rehearsal.

## Auth retention purge

Deletes aged `SecurityEvent` rows, expired/revoked sessions, used/expired
email tokens, stale `AuthRateLimit` windows, and operational tables past
their windows (`CostLog`, `ImplicitSignal`, `ChatGeneration`,
`WorkflowEvent`):

```bash
pnpm auth:purge-retention
```

Schedule daily (example cron):

```cron
15 3 * * * cd /app && pnpm auth:purge-retention >> /var/log/furnishes-purge.log 2>&1
```

Env: `SECURITY_EVENT_RETENTION_DAYS` (default 90),
`AUTH_RATE_LIMIT_RETENTION_DAYS` (default 7),
`COST_LOG_RETENTION_DAYS` (default 90),
`IMPLICIT_SIGNAL_RETENTION_DAYS` (default 90),
`CHAT_GENERATION_RETENTION_DAYS` (default 90),
`WORKFLOW_EVENT_RETENTION_DAYS` (default 90).

## Commerce order reconcile

Unpaid orders with a `paymentRef` older than
`COMMERCE_RECONCILE_STALE_MINUTES` (default 30) are checked against Stripe and
marked paid or cancelled:

```bash
pnpm commerce:reconcile
pnpm commerce:order-inspect -- FZ-1001
```

Schedule beside the auth purge. Manual `commerce:order-resettle` writes a
`SecurityEvent`.

## Image generation reconciliation

Generation status normally advances only while a browser polls
`POST /api/account/image-generations/[id]/refresh`. A closed tab or an app
restart leaves rows in `queued`/`generating` indefinitely, and those rows keep
consuming the user's `IMAGE_GENERATION_MAX_CONCURRENT_PER_USER` budget — so an
affected user can no longer start a generation at all. This job re-polls stale
rows and fails the ones that are past saving:

```bash
pnpm image-gen:reconcile
```

Schedule every few minutes whenever the image provider is enabled:

```cron
*/5 * * * * cd /app && pnpm image-gen:reconcile >> /var/log/furnishes-imagegen.log 2>&1
```

Env: `IMAGE_GENERATION_RECONCILE_STALE_MINUTES` (default 3),
`IMAGE_GENERATION_ABANDON_MINUTES` (default 30),
`IMAGE_GENERATION_RECONCILE_BATCH` (default 50).

Each run logs an `image_generation_reconcile` event with counts of rows
examined, advanced, abandoned, and left unresolved. A sustained non-zero
`abandoned` count means the provider is dropping jobs.

## Credential rotation

| Secret                          | Steps                                                                |
| ------------------------------- | -------------------------------------------------------------------- |
| `AUTH_SECRET`                   | Rotate → all sessions invalid → users re-login                       |
| `DATABASE_URL`                  | Update app + migrate job; drain old connections                      |
| SMTP / S3 / OpenAI / image HTTP | Update env → restart; confirm `/api/health?ready=1` and a smoke send |

After rotation, revoke other sessions from Settings or
`POST /api/account/settings/sessions/revoke-others` as the affected user.

## Incident starters

| Symptom                     | Check                                   | Action                                             |
| --------------------------- | --------------------------------------- | -------------------------------------------------- |
| Ready probe 503             | Postgres, `DATABASE_URL`, network       | Fail closed; restore DB / fix URL                  |
| Login flood / 429           | `[ops]` / auth rate keys                | Keep limits; revoke abusive sessions               |
| Chat provider errors        | `[chat-ops]`, OpenAI status             | See `docs/CHAT_ROLLOUT.md` rollback                |
| Upload / image gen failures | `STORAGE_PROVIDER`, S3 credentials      | Fix bucket/IAM; avoid local disk on multi-instance |
| Mail not arriving           | `SMTP_HOST`, provider logs              | Fall back to log mode only in non-prod             |
| Disk growth                 | `SecurityEvent`, uploads, Postgres size | Run purge; confirm S3 lifecycle rules              |

## Boot preflight

On Node runtime start, `src/instrumentation.ts` runs
`src/server/ops/preflight.ts`:

- Logs a capability-flag snapshot (`preflight_flags`), including
  `quizIngest: always_on_rate_limited` (no env flag; 5/day/user).
- **Fails boot** on fatal combos (e.g. `CHAT_RENDERS_ENABLED=1` with
  `IMAGE_RESTYLE_PROVIDER=disabled`, invalid tools rollout, missing production
  OpenAI/S3/`AUTH_SECRET` when those providers are selected).
- **Fails boot in production** without `SMTP_HOST` (log-only mail reports
  success while nothing is delivered), without an https `APP_ORIGIN`, or with
  `IMAGE_GENERATION_PROVIDER=http` and missing provider credentials.
- **Warns** when `CHAT_RAG_ENABLED=1` and `DesignDoc` count is 0, and when
  `STORAGE_PROVIDER=local` in production (single-instance only).

The same checks run against an env file before deploying:

```bash
pnpm check:prod-config .env.production
```

Staged enablement: `docs/ROLLOUT_PLAN.md`.

## Observability (current)

- JSON `[ops]` logs from `src/server/ops/log.ts` + boot via `instrumentation.ts`
- Boot preflight issues: `preflight_issue` / `preflight_flags` events
- Chat operational events via `src/server/conversations/chat-ops.ts`
- Health liveness / readiness endpoints

Sentry / APM SDKs stay lint-blocked until an owning change wires them and
logs the dependency in `docs/ARCHITECTURE.md`. Ship aggregator scrape of
stdout JSON first.

## On-call release gate

Before expanding chat cohort or cutting a production release:

- [ ] CI green on the release commit
- [ ] Ready probe green in the target env
- [ ] Backup / restore rehearsal within the last 30 days
- [ ] Retention purge scheduled
- [ ] Image generation reconciliation scheduled (when the provider is enabled)
- [ ] `pnpm check:prod-config` clean against the target env
- [ ] Rollback owner named for the window
- [ ] Commerce only: payment provider is `stripe`, the webhook endpoint is
      registered and reachable, and no order has sat in `pending_payment`
      longer than the provider's authorisation window

## Payments runbook

Money moves on the provider's word, not the browser's, so the webhook is the
only thing that advances an order. Symptoms and where to look:

| Symptom                             | Likely cause                                       | Check                                                                                         |
| ----------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Orders stuck in `pending_payment`   | webhook never arrived                              | `commerce_webhook_rejected` / absent `commerce_order_paid` logs; provider's delivery attempts |
| `503 provider_disabled` at checkout | `COMMERCE_PAYMENT_PROVIDER` unset                  | `pnpm check:prod-config`                                                                      |
| Webhook 400s in bursts              | wrong `STRIPE_WEBHOOK_SECRET` after a key rotation | `reason:"signature_invalid"` in ops logs                                                      |
| Duplicate payment for one cart      | should be impossible                               | `Order.paymentRef` is unique; a second intent for a live order is refused                     |

Subscribe the endpoint to `checkout.session.completed`,
`checkout.session.expired`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, and `charge.refunded`. The first is what
actually marks an order paid; without it nothing settles.

Replays are safe: every event id is written to `ProcessedPaymentEvent` before the
order moves, so a redelivered event returns `duplicate: true` and changes
nothing. Refunds are recorded, not initiated — issue them in the provider
dashboard and the webhook writes the status back. An expired or failed session
releases the order and returns its items to the shopper's cart.
