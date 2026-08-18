# DesignBrief export

Handoff contract from Chat (and Room Plan) to the Design page. Assembles
confirmed preferences, optional RoomPlan items/budget, readiness, and a short
Eva narrative.

## Flag

| Env                    | Default | Meaning                                                  |
| ---------------------- | ------- | -------------------------------------------------------- |
| `DESIGN_BRIEF_ENABLED` | `0`     | Master switch for API, chat intent, and `getDesignBrief` |

## Contract

`DesignBriefV1` in `src/lib/contracts/design-brief.ts`:

- `room` / `style` / `palette` / `budget` / `items` / `readiness`
- `narrative` — 3–5 sentences (LLM, cost kind `brief`; fallback if provider fails)

No new Prisma models; RoomPlan is loaded via ownership-scoped Prisma (not gated
by `CHAT_ROOM_PLAN_ENABLED`).

## Modules

| Path                                            | Role                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `src/lib/contracts/design-brief.ts`             | `DesignBriefV1` type                                     |
| `src/server/design-brief/build-design-brief.ts` | Builder + chat-intent helpers                            |
| `GET /api/account/design-brief`                 | Session + ownership; `?roomPlanId=` / `?conversationId=` |

Design page (and other server code) should import `getDesignBrief` directly.

## Chat intent

When the flag is on, messages matching phrases such as "my brief", "design
brief", "summarize my design plan", or "export my brief" short-circuit the
normal chat provider and return the narrative (sync + stream paths).

## Cost

Narrative generation uses `CostKind` `"brief"` and model routing task `"brief"`.
