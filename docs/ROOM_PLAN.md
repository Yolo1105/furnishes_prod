# Room Plan + orderable score

Structured room shopping plans with a readiness ("orderable") score. The score
ships **ahead of commerce by design** — the plan is built to terminate in an
order later; checkout remains deferred.

## Flags

| Env                           | Default | Meaning                                                 |
| ----------------------------- | ------- | ------------------------------------------------------- |
| `CHAT_ROOM_PLAN_ENABLED`      | `0`     | Master switch for APIs, chat block, client plan view    |
| `ROOM_PLAN_ORDER_CTA_ENABLED` | `0`     | Shows copy-only "Ready to order — checkout coming soon" |

## Schema

Migration `20260804200000_add_room_plan`:

- `RoomPlan` — user-owned, optional `projectId`, `budgetCapCents`, `currency`
- `RoomPlanItem` — label/category/priority/status, budget/actual cents, optional
  dimension fields (`widthCm`/`depthCm`/`heightCm`) stored but **unused**
  (spatial track deferred), optional `recommendationId` / `inspirationItemId`

## Modules

| Path                                       | Role                                      |
| ------------------------------------------ | ----------------------------------------- |
| `src/server/room-plan/budget-allocator.ts` | Deterministic room-type % bands           |
| `src/server/room-plan/readiness.ts`        | Score 0–100 + label + missing core        |
| `src/server/room-plan/room-plan-prompt.ts` | Chat system-prompt block                  |
| `src/server/room-plan/service.ts`          | CRUD + save-recommendation + chat resolve |

### Readiness weights

- Core decided: 60
- Secondary decided: 20
- Budget within cap: 10
- Style + color confirmed: 10

`ready to order` ⇔ all core decided AND not over budget.

## APIs

- `GET`/`POST` `/api/account/room-plans`
- `GET`/`PATCH` `/api/account/room-plans/[roomPlanId]`
- `POST` `/api/account/room-plans/[roomPlanId]/items` (supports `recommendationId` + `conversationId` save path)
- `PATCH` `/api/account/room-plans/[roomPlanId]/items/[itemId]`

## Chat + workflow

When enabled, the latest project-scoped plan (else latest user plan) is appended
after the workflow prompt slot with remaining budget and readiness. Workflow
`recommendation_generation → refinement` also advances when ≥50% of core items
are decided.

## Client

Chat workspace section **Room plan** (`ChatSecKey: "plan"`): progress score,
budget bar, status chips, missing-core list, order CTA copy when ready.
