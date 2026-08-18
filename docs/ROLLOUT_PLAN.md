# Feature rollout plan

Staged enablement of chat intelligence and side surfaces after providers are
healthy. Expand only when the previous stage’s rollup metrics look healthy.
Provider cohort mechanics (`CHAT_ROLLOUT_*`) are detailed in
`docs/CHAT_ROLLOUT.md`; this document covers **capability flags** on top of that
cohort.

Quiz ingestion (`POST /api/account/quiz-results`) has **no feature flag** — it
is always available to authenticated users and is rate-limited (5/day/user).
Treat quiz-ingest volume as a Stage 3+ metric, not a flag flip.

Defaults in `.env.example` keep all capability flags at `0` / safe providers.

## Rollup metrics (every stage)

Before advancing, record a UTC-day rollup (CostLog + `[ops]` / `[chat-ops]`):

| Metric             | Source                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| Cost by kind       | `costByKind` from daily cost rollup (`chat`, `vision`, `brief`, `image`, …) |
| Cache-hit ratio    | `cacheHitRatio` on the same rollup                                          |
| Failures           | `[chat-ops]` typed failures + provider errors                               |
| Explain-retries    | `recommendation_explain_retry` events                                       |
| Tool would-fire    | `chat_tools_shadow` (`toolCount` / tool names) while tools are shadow       |
| Quiz-ingest counts | Successful `POST /api/account/quiz-results` (created/skipped) from Stage 3  |

Never paste user message text or preference values into tickets.

---

## Stage 1 — Providers only

OpenAI chat + extraction for an allowlisted / zero-percent cohort. No RAG,
summary, workflow, room plan, tools, or renders.

```bash
CHAT_PROVIDER=openai
OPENAI_API_KEY=…
CHAT_MODEL_PRIMARY=…
CHAT_MODEL_FALLBACK=…
PREFERENCE_EXTRACTION_PROVIDER=openai
PREFERENCE_EXTRACTION_MODEL=…
CHAT_ROLLOUT_ALLOWLIST=you@company.com
CHAT_ROLLOUT_PERCENT=0

# Keep capability flags off
CHAT_RAG_ENABLED=0
CHAT_SUMMARY_ENABLED=0
CHAT_WORKFLOW_ENABLED=0
CHAT_SIDE_FEATURES_ENABLED=0
CHAT_ROOM_PLAN_ENABLED=0
DESIGN_BRIEF_ENABLED=0
CHAT_TOOLS_ENABLED=0
CHAT_COPILOT_MODE_ENABLED=0
CHAT_RENDERS_ENABLED=0
IMAGE_RESTYLE_PROVIDER=disabled
```

**Rollback:** `CHAT_PROVIDER=local`, `PREFERENCE_EXTRACTION_PROVIDER=heuristic`, `CHAT_ROLLOUT_PERCENT=0`, clear allowlist.

---

## Stage 2 — RAG / summary / workflow (allowlist cohort)

Enable retrieval, rolling summary, and design-workflow for the same allowlisted
users. Seed RAG first (`SEED_RAG=1 pnpm db:seed:rag`) so `DesignDoc` is non-empty
— production preflight **warns** if `CHAT_RAG_ENABLED=1` with zero rows.

```bash
# Stage 1 providers + cohort still on
CHAT_RAG_ENABLED=1
RAG_EMBEDDING_MODEL=text-embedding-3-small
CHAT_SUMMARY_ENABLED=1
CHAT_WORKFLOW_ENABLED=1
# Optional memory / signals when metrics are quiet:
# CHAT_PROJECT_MEMORY_ENABLED=1
# CHAT_IMPLICIT_SIGNALS_ENABLED=1
```

**Rollback:** `CHAT_RAG_ENABLED=0`, `CHAT_SUMMARY_ENABLED=0`, `CHAT_WORKFLOW_ENABLED=0` (and memory/signal flags to `0` if enabled).

---

## Stage 3 — Room plan / brief / side features at 10% + quiz ingest

Expand the OpenAI chat cohort to ~10% and turn on room plan, DesignBrief, and
side features. Quiz ingest is already live (no flag); start counting ingest
volume and proposal accept rates here.

```bash
CHAT_ROLLOUT_ALLOWLIST=   # optional
CHAT_ROLLOUT_PERCENT=10

CHAT_ROOM_PLAN_ENABLED=1
# ROOM_PLAN_ORDER_CTA_ENABLED=1   # copy-only CTA when ready
DESIGN_BRIEF_ENABLED=1
CHAT_SIDE_FEATURES_ENABLED=1
CHAT_POLICY_GATING_ENABLED=1
```

**Rollback:** `CHAT_ROLLOUT_PERCENT=0`, `CHAT_ROOM_PLAN_ENABLED=0`, `DESIGN_BRIEF_ENABLED=0`, `CHAT_SIDE_FEATURES_ENABLED=0`.

---

## Stage 4 — Tools / copilot (shadow → allowlist → percent)

Enable tool-calling and Design/Explore copilot in three sub-steps. Keep renders
off until Stage 5.

### 4a — Shadow

```bash
CHAT_TOOLS_ENABLED=1
CHAT_TOOLS_ROLLOUT=shadow
CHAT_COPILOT_MODE_ENABLED=0
```

Watch `chat_tools_shadow` would-fire counts; no tool execution.

### 4b — Allowlist execute

```bash
CHAT_TOOLS_ROLLOUT=allowlist
CHAT_TOOLS_ALLOWLIST=you@company.com
CHAT_COPILOT_MODE_ENABLED=1
```

### 4c — Percent execute

```bash
CHAT_TOOLS_ROLLOUT=percent
CHAT_TOOLS_ROLLOUT_PERCENT=10   # then 25 → 50
CHAT_TOOLS_ALLOWLIST=
```

**Rollback:** `CHAT_TOOLS_ENABLED=0`, `CHAT_TOOLS_ROLLOUT_PERCENT=0`, `CHAT_COPILOT_MODE_ENABLED=0`.

---

## Stage 5 — 100% cohort; renders last

```bash
CHAT_ROLLOUT_PERCENT=100
CHAT_TOOLS_ROLLOUT=percent
CHAT_TOOLS_ROLLOUT_PERCENT=100

# Renders last — never enable with IMAGE_RESTYLE_PROVIDER=disabled
CHAT_RENDERS_ENABLED=1
IMAGE_RESTYLE_PROVIDER=http
IMAGE_RESTYLE_MODEL=…
IMAGE_GENERATION_API_URL=…
IMAGE_GENERATION_API_KEY=…
IMAGE_GENERATION_MODEL=…
RENDERS_DAILY_LIMIT=10
```

Production preflight **fails boot** if `CHAT_RENDERS_ENABLED=1` with
`IMAGE_RESTYLE_PROVIDER=disabled` (or any non-`test`/`http` value).

**Rollback:** `CHAT_RENDERS_ENABLED=0`, `IMAGE_RESTYLE_PROVIDER=disabled`; optionally `CHAT_ROLLOUT_PERCENT=0` / `CHAT_TOOLS_ENABLED=0` for a full capability freeze.

---

## Related

- Provider cohort + incident runbook: `docs/CHAT_ROLLOUT.md`
- Flag validation walkthrough: `docs/MASTER_DOD_VALIDATION.md`
- Boot preflight: `src/server/ops/preflight.ts` (see `docs/OPERATIONS.md`)
- Env catalog: `.env.example`
