# Chat provider rollout

Staged enablement of production chat + preference extraction. Expand only when
the previous stage’s metrics and failure mapping look healthy.

Capability flags (RAG, room plan, tools, renders, …) follow
`docs/ROLLOUT_PLAN.md` on top of this provider cohort.

## Stages

### 1 — Baseline (CI / local default)

```bash
CHAT_PROVIDER=local
PREFERENCE_EXTRACTION_PROVIDER=heuristic
CHAT_ROLLOUT_PERCENT=100
```

Run `pnpm check`, account chat-memory E2E, and
`pnpm migrate:legacy-chat:dry-run`.

### 2 — Shadow extraction

Keep heuristic as the active extractor. Enable OpenAI extract for comparison
only (no proposal persistence from the shadow path):

```bash
PREFERENCE_EXTRACTION_PROVIDER=heuristic
PREFERENCE_EXTRACTION_SHADOW=1
OPENAI_API_KEY=…
PREFERENCE_EXTRACTION_MODEL=…
```

Review `[chat-ops]` `extraction_shadow` events (candidate counts only).

### 3 — Internal users

```bash
CHAT_PROVIDER=openai
CHAT_MODEL_PRIMARY=…
CHAT_MODEL_FALLBACK=…
CHAT_ROLLOUT_ALLOWLIST=you@company.com,ops@furnishes.local
CHAT_ROLLOUT_PERCENT=0
PREFERENCE_EXTRACTION_PROVIDER=openai
PREFERENCE_EXTRACTION_SHADOW=0
```

Verify latency, cost, proposal quality, persona differentiation, and typed
errors (`rate_limited`, `daily_limit`, `provider_unavailable`,
`moderation_rejected`, `generation_in_progress`).

### 4 — Small cohort

```bash
CHAT_ROLLOUT_ALLOWLIST=   # optional still
CHAT_ROLLOUT_PERCENT=10   # then 25 → 50
```

Buckets are stable per `userId` (`chatRolloutBucket`). Users outside the window
keep the local chat provider while `CHAT_PROVIDER=openai`.

### 5 — General release

```bash
CHAT_ROLLOUT_PERCENT=100
```

Gate on: green CI, provider health, cost alerts, backups, rollback + incident
runbooks below.

## Quotas

| Env                                | Default | Error                                            |
| ---------------------------------- | ------- | ------------------------------------------------ |
| `CHAT_USER_MESSAGES_PER_MINUTE`    | 20      | `rate_limited`                                   |
| `CHAT_USER_MESSAGES_PER_DAY`       | 200     | `daily_limit`                                    |
| `CHAT_EXTRACTION_PER_MINUTE`       | 30      | skip proposals (chat still succeeds)             |
| `CHAT_SESSION_COST_LIMIT_USD`      | 2       | `cost_limit`                                     |
| `CHAT_USER_DAILY_COST_LIMIT_USD`   | 5       | `cost_limit` (alias: `CHAT_USER_DAILY_COST_USD`) |
| `CHAT_GLOBAL_DAILY_COST_LIMIT_USD` | 100     | `cost_limit`                                     |

Message quotas live in `chat-rate-limit`; spend caps live in `cost-guard`
(CostLog only). Set a limit to `0` to disable that check.

## Rollback

1. Set `CHAT_PROVIDER=local` (or `CHAT_ROLLOUT_PERCENT=0` with allowlist cleared).
2. Set `PREFERENCE_EXTRACTION_PROVIDER=heuristic` (or `disabled`).
3. Redeploy / restart app processes so env is picked up.
4. Confirm `[chat-ops]` shows `provider: local` and no OpenAI cost spike.

No schema rollback is required for provider switches.

## Incident runbook

| Symptom                         | First checks                              | Action                                                        |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Spike in `provider_unavailable` | API key, model names, OpenAI status       | Rollback to local; rotate key if leaked                       |
| Cost spike                      | `[chat-ops]` costUsd, CostLog rollup      | Lower `CHAT_GLOBAL_DAILY_COST_LIMIT_USD`; reduce cohort %     |
| Rate-limit flood                | Bot / loop client                         | Tighten per-minute limits; revoke abusive sessions            |
| Bad proposals                   | Shadow vs heuristic counts; sample review | Switch extraction to heuristic; keep chat on openai if needed |
| DB pressure                     | Postgres connections, slow queries        | Pause cohort; scale DB / check migration load                 |

Do not paste user message content into tickets or logs.

## Health checklist before general release

- [ ] `pnpm check` green on the release commit
- [ ] Chat-memory + auth E2E green
- [ ] Legacy migration dry-run green in CI
- [ ] Backup / restore rehearsal recorded (`docs/DATABASE.md`)
- [ ] Cost and failure alerts wired to on-call
- [ ] Rollback owner named for the release window
