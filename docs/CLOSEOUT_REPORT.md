# Closeout Report

Date: 2026-08-04  
Repo: `furnishes_temp`  
Node engines: `24.13.0` (package.json)

---

## PART 1 — Scope additions (share / insights / studio)

### Decision

Asked once: keep share/insights/studio dark (default), or remove any?

**Outcome: KEEP, DARK** (default — developer did not override).

Modules retained flag-off:

| Module                     | Flag                      | Doc                               |
| -------------------------- | ------------------------- | --------------------------------- |
| chat-share                 | `CHAT_SHARE_ENABLED=0`    | `docs/CHAT_SHARE_AND_INSIGHTS.md` |
| chat-insights              | `CHAT_INSIGHTS_ENABLED=0` | `docs/CHAT_SHARE_AND_INSIGHTS.md` |
| studio image-piece backend | `STUDIO_ENABLED=0`        | `docs/STUDIO.md`                  |

Architecture note added under **Scope additions accepted post-hoc** in
`docs/ARCHITECTURE.md`.

### Gate

Commands:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip && pnpm format:check
```

| Step                | Result                                                                              |
| ------------------- | ----------------------------------------------------------------------------------- |
| `pnpm typecheck`    | PASS                                                                                |
| `pnpm lint`         | PASS                                                                                |
| `pnpm test`         | PASS — 75 files, **353** tests                                                      |
| `pnpm knip`         | PASS                                                                                |
| `pnpm format:check` | FAIL → fixed Prettier on `docs/CLOSEOUT_REPORT.md` + `BillingPage.tsx`; re-run PASS |

**Part 1: PASS**

---

## PART 2 — Environment verification

### 2.1 Toolchain

| Check                            | Result                                 |
| -------------------------------- | -------------------------------------- |
| `node --version`                 | `v24.13.0` (matches engines `24.13.0`) |
| `pnpm install --frozen-lockfile` | PASS (already up to date)              |

### 2.2 Database

| Step                   | Result                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `pnpm db:up`           | PASS — `furnishes-postgres` healthy on `:5433`                                                                     |
| `npx prisma generate`  | PASS                                                                                                               |
| `pnpm db:migrate`      | PASS — 11 migrations, none pending                                                                                 |
| Sanity: `DATABASE_URL` | `127.0.0.1:5433` / db `furnishes` (local Docker only)                                                              |
| Consent                | `yes, run pnpm db:reset on local docker`                                                                           |
| `pnpm db:reset`        | **PASS** — all 11 migrations applied on fresh DB, including `add_studio_pieces` and `add_room_plan`; seed executed |

Migrations applied (order):

1. `20260723210000_postgres_baseline`
2. `20260723220000_chat_generation_idempotency`
3. `20260803230000_add_cost_log`
4. `20260803240000_add_design_doc`
5. `20260803250000_add_design_recommendation`
6. `20260803260000_add_conversation_workflow`
7. `20260804160000_add_conversation_summary`
8. `20260804170000_add_implicit_signal`
9. `20260804180000_add_studio_pieces`
10. `20260804190000_add_conversation_share`
11. `20260804200000_add_room_plan`

### 2.3 Typecheck (real Prisma client)

| Step             | Result                           |
| ---------------- | -------------------------------- |
| `pnpm typecheck` | **PASS** — no Decimal/JSON drift |

### 2.4 Full unit + integration

| Step                | Result                                            |
| ------------------- | ------------------------------------------------- |
| `pnpm test` (DB up) | **PASS** — 75 files, **353** tests, **0** skipped |

DB-gated suites (`describe.runIf(hasDb)`) that ran against live Postgres:

| Suite                                 | Tests  |
| ------------------------------------- | ------ |
| `image-generation-service.test.ts`    | 9      |
| `preference-service.test.ts`          | 3      |
| `service-persona-preferences.test.ts` | 2      |
| `piece-service.test.ts` (studio)      | 5      |
| `cost-guard.integration.test.ts`      | 1      |
| `chat-idempotency.test.ts`            | 3      |
| **Total DB-gated**                    | **23** |

### 2.5 Seed + RAG

| Step                          | Result                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| `pnpm db:seed`                | **PASS** (also ran as part of `db:reset`)                     |
| `SEED_RAG=1 pnpm db:seed:rag` | **PASS** (2026-08-13) — 36 design doc chunks upserted         |
| `DesignDoc` count             | **36** chunks (12 docs × 3 chunks)                            |
| Embedding cost                | billed to configured OpenAI key (local `.env`; not committed) |

### 2.6 E2E

Command: `pnpm test:e2e` (single build; covers all `test:e2e:*` specs).  
E2E target DB: `furnishes_e2e` @ `127.0.0.1:5433` (fresh migrate reset + seed).

| Suite (package script)         | Specs                                                                     | Result          |
| ------------------------------ | ------------------------------------------------------------------------- | --------------- |
| `test:e2e:account:visual`      | architecture-baseline                                                     | PASS            |
| `test:e2e:account:chat-memory` | chat-personas-preferences                                                 | PASS            |
| `test:e2e:account:core`        | shell, profile, conversations, projects, uploads, security, help-commerce | PASS            |
| `test:e2e:account:creative`    | image-generation, inspiration                                             | PASS            |
| `test:e2e:landing`             | landing-ui, landing-webgl, routes                                         | PASS            |
| **Overall**                    | **83** tests                                                              | **PASS** (2.0m) |

### 2.7 Eval replay

| Step                             | Result                                              |
| -------------------------------- | --------------------------------------------------- |
| `pnpm eval` (`EVAL_MODE=replay`) | **PASS** — `goldens=31 turns=31 passed=31 failed=0` |

**Part 2: PASS** (RAG seed completed 2026-08-13)

### Post-closeout production blockers (2026-08-04 evening)

| Item                                                   | Result                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Account deletion wipe (RoomPlan + all personal tables) | **FIXED** — `deleteAccount` explicit wipe; CostLog retained by design; `privacy.integration.test.ts`  |
| Security headers                                       | **FIXED** — owned by `next.config.ts` (CSP, frame deny, nosniff, referrer, permissions; HSTS in prod) |
| Dependency pins                                        | **FIXED** — `pnpm.overrides` uuid ≥11.1.1, postcss ≥8.5.23; `pnpm audit:prod` clean                   |

---

## PART 3 — Live eval baseline

**PASS** (2026-08-13, developer machine)

| Step                          | Result                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| Providers                     | `CHAT_PROVIDER=openai`, `PREFERENCE_EXTRACTION_PROVIDER=openai` |
| `SEED_RAG=1 pnpm db:seed:rag` | **PASS** — 36 chunks                                            |
| `EVAL_MODE=live pnpm eval`    | **PASS** — `goldens=32 turns=32 passed=32 failed=0`             |

---

## PART 4 — Flag-on validation walkthrough

**BLOCKED** — live eval is green, but the manual flag-on scenarios in
`docs/MASTER_DOD_VALIDATION.md` (summary, project memory, side features,
room plan, design brief, renders, tools, copilot) have not been walked yet.
Do not mark PASS until each row is exercised with the matching flag on.

---

## PART 5 — Rollout preparation

| Deliverable                  | Result                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| `docs/ROLLOUT_PLAN.md`       | **PASS** — Stages 1–5, rollup metrics, one-line rollbacks            |
| Production boot preflight    | **PASS** — `src/server/ops/preflight.ts` + unit tests; wired in boot |
| Live eval (Part 3)           | **PASS** — see Part 3                                                |
| Flag-on walkthrough (Part 4) | **BLOCKED** — still pending                                          |

Quiz ingest: no feature flag (rate-limited API); documented in rollout Stage 3+.

---

## PART 6 — Legacy data rehearsal

**BLOCKED** — `LEGACY_DATABASE_URL` is unset/empty. Do not run
`pnpm migrate:legacy-chat:apply` until a legacy Postgres copy is provisioned.
Dry-run docs remain in `docs/LEGACY_CHAT_MIGRATION.md` /
`docs/legacy/migration-dryrun-2026-08-04.md`.
