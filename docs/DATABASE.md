# PostgreSQL baseline (Phase B)

## Decision

Path A from the chat backend integration plan: no production traffic on the
old SQLite files. The active Prisma provider is **PostgreSQL**. Historical
SQLite migrations are kept only under
`prisma/migrations_sqlite_archived/` and must not be applied.

## Local

```bash
pnpm db:up
# DATABASE_URL=postgresql://furnishes:furnishes@127.0.0.1:5433/furnishes?schema=public
pnpm db:migrate
pnpm db:seed
```

- Host port **5433** → container 5432 (avoids clashing with other local Postgres).
- `furnishes_e2e` is created by `docker/postgres/init/01-create-e2e-db.sql`.
- E2E runner resets `furnishes_e2e` via `prisma migrate reset --force`.

## CI

GitHub Actions jobs that touch the database start a `postgres:16` service and
set `DATABASE_URL=postgresql://ci:ci@127.0.0.1:5432/ci?schema=public`.

## Integration test data

Vitest runs test files in parallel forks against one database, so DB-gated tests
(`describe.runIf(hasDb)`) **must create their own user** via
`src/server/test-support/db-fixtures.ts` rather than reusing the seeded
`owner@example.com` row:

```ts
userId = (await createTestUser("my-suite")).id;
// afterAll
await deleteTestUsers(userId);
```

Several quotas are DB-backed and count rows, not calls — 20 chat messages per
rolling 60 seconds, 20 image generations per UTC day, 2 concurrent. Files sharing
one user pool their traffic into those counters and fail each other with
`rate_limited`, and because the windows are wall-clock, consecutive suite runs
inside the same minute accumulate. Seeded rows are for the app and E2E; unit
integration tests own their data.

## Backup / restore rehearsal

Local compose dump:

```bash
pnpm db:backup
# → backups/furnishes-<stamp>.sql
```

Or manually:

```bash
docker compose exec -T postgres pg_dump -U furnishes furnishes > backup.sql
docker compose exec -T postgres psql -U furnishes -d furnishes -c "SELECT count(*) FROM \"User\";"
# Restore into a scratch DB when validating:
# createdb -U furnishes furnishes_restore
# psql -U furnishes -d furnishes_restore < backup.sql
```

Full day-2 procedures (managed Postgres, retention purge, incidents):
`docs/OPERATIONS.md`. Deploy topology: `docs/DEPLOYMENT.md`.

Do not point this app at legacy `furnishes_prod` tables directly. Historical
chat import is an explicit ETL — see `docs/LEGACY_CHAT_MIGRATION.md`
(`pnpm migrate:legacy-chat:dry-run`).

## CostLog

Migration `20260803230000_add_cost_log` adds `CostLog` for per-call LLM spend
(chat, extraction, embedding, vision, recommendation, suggestion, brainstorm,
insight, brief, image). **CostLog is the only spend-governance ledger.** Caps
via `src/server/ops/cost-guard.ts`:

- `CHAT_SESSION_COST_LIMIT_USD` (per conversation)
- `CHAT_USER_DAILY_COST_LIMIT_USD` (UTC day; alias `CHAT_USER_DAILY_COST_USD`)
- `CHAT_GLOBAL_DAILY_COST_LIMIT_USD` (UTC day, all users)

`ChatGeneration.costUsd` remains telemetry only — dashboards and caps must
read CostLog, not the Float column. Message-count quotas stay in
`chat-rate-limit.ts` (no cost aggregates).

## DesignDoc (RAG)

Migration `20260803240000_add_design_doc` adds `DesignDoc` for chunked design
knowledge + `Float[]` embeddings. Corpus lives in `config/design-docs/`. Seed
with `SEED_RAG=1 pnpm db:seed:rag` (requires `OPENAI_API_KEY`). Chat retrieval
is gated by `CHAT_RAG_ENABLED` (default off). Boot preflight warns when RAG is
enabled and `DesignDoc` count is 0 (`docs/OPERATIONS.md`, `docs/ROLLOUT_PLAN.md`).

## DesignRecommendation + StyleProfile.roomDimensions

Migration `20260803250000_add_design_recommendation` adds catalog-free design
archetype recommendations (`DesignRecommendation`) and optional
`StyleProfile.roomDimensions` JSON for layout policy gating.

## Conversation workflow

Migration `20260803260000_add_conversation_workflow` adds `WorkflowStage` enum,
`Conversation.workflowStage` (default `intake`), and `WorkflowEvent` audit rows.
Gated by `CHAT_WORKFLOW_ENABLED` (default off). See `docs/CHAT_WORKFLOW.md`.

## Conversation context summary

Migration `20260804160000_add_conversation_summary` adds
`Conversation.contextSummary`, `contextSummaryUpTo`, and
`contextSummaryUpdatedAt` for rolling summaries of older turns. Gated by
`CHAT_SUMMARY_ENABLED` (default off). See `docs/CHAT_CONTEXT_SUMMARY.md`.

## ImplicitSignal

Migration `20260804170000_add_implicit_signal` adds `ImplicitSignal` — behavioral
signals stored as `type` + optional `category` only (never message text or
preference values). Gated by `CHAT_IMPLICIT_SIGNALS_ENABLED` (default off).

## PreferenceProposal.resolvedAt

Baseline migration includes `PreferenceProposal.resolvedAt` for accept/reject
timestamps. Used by `src/server/preferences/calibration.ts` for acceptance-rate
reports (`GET /api/account/preferences/calibration`).

## PreferenceProposal quiz provenance

Migration `20260813120000_quiz_proposal_provenance` adds `PreferenceProposal.source`
(`chat` \| `quiz`, default `chat`) and makes `conversationId` / `sourceMessageId`
nullable so quiz ingest can create pending proposals without a chat message.
Quiz rows use `evidenceText` “From your Design Quiz”; chat extract rows keep
message FKs.

## SharedProject

Migration `20260804190000_add_conversation_share` adds `SharedProject` —
anonymous share links (`shareId`, optional `expiresAt`). Gated by
`CHAT_SHARE_ENABLED` (default off). Public read returns title + messages only
(no preference values). See `docs/CHAT_SHARE_AND_INSIGHTS.md`.

## RoomPlan / RoomPlanItem

Migration `20260804200000_add_room_plan` adds user-owned room shopping plans
with line items (priority/status/budget/actual, optional unused dimension
fields). Gated by `CHAT_ROOM_PLAN_ENABLED` (default off). See `docs/ROOM_PLAN.md`.

## FurnitureStudioPiece

Migration `20260804180000_add_studio_pieces` adds image-only studio pieces
linked to `ImageGeneration` / `Upload`. Gated by `STUDIO_ENABLED` (default off).
Mesh/GLB deferred. See `docs/STUDIO.md`.

## Commerce (catalog, cart, orders)

Migration `20260814051305_add_commerce` adds the storefront: `Product` →
`Variant` → `VariantPrice`, a per-user `Cart` with `CartItem`, reusable
`Address`, and `Order` → `OrderItem`, plus `ProcessedPaymentEvent` for webhook
replay protection. Gated by `COMMERCE_ENABLED` (default off).
See `docs/COMMERCE.md`.

Rules the schema itself enforces, because money cannot be fixed up later:

- **Prices are authored per currency, never converted.** `VariantPrice` is
  unique on `(variantId, currency)` and holds integer cents. A variant with no
  row for the shopper's currency is simply not purchasable there.
- **A cart is single-currency.** `Cart.currency` is set on the first add, and
  a variant lacking a price in it is refused rather than silently converted.
- **`CartItem.unitPriceCents` is captured at add time**, so a catalog change
  cannot reprice a cart out from under a shopper mid-session.
- **`Order` is a snapshot, not a join.** `OrderItem` copies name, SKU and
  price, and its `variantId` is `SetNull`, so history survives a variant being
  deleted. Deleting a variant that sits in a live cart is `Restrict`ed instead.
- **`Order.paymentRef` is unique**, which is what makes webhook handling
  idempotent: an event can only ever resolve to one order.
