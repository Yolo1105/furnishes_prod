# Chat backend integration

Production path:

```text
Chat UI
→ typed Account APIs
→ Conversation / Persona / Preference services
→ provider adapters (local | openai)
→ PostgreSQL
```

The legacy `furnishes_prod` repo is a **selective behavior reference**, not a
runtime dependency. Historical data uses an explicit ETL
(`docs/LEGACY_CHAT_MIGRATION.md`).

## In scope

- Conversations, messages, feedback
- Personas (`User.activeAssistantId`, `Message.assistantId`)
- Confirmed preferences + pending proposals (`inferred != remembered`)
- Local + OpenAI chat / extraction providers
- Memory toggle, idempotent sends, parallel extraction
- Rate limits, sanitization, moderation hooks, operational logs
- SSE streaming replies and composer Stop (partial `stopped` messages)

## Out of scope

Attachments, guests, sharing/export UI, playbooks, RAG, recommendations,
marketplace.

## Streaming

Message POST accepts `stream: true` and returns `text/event-stream`:

```text
user → tool_activity* → delta* → done | stopped | error
```

`tool_activity` events are `{ type, tool, status }` with tool **names only**
(when `CHAT_TOOLS_ENABLED` execute rollout is on).

Client Stop aborts the fetch; the server keeps a partial assistant with
`status=stopped` (no preference proposals). Non-stream JSON POST remains for
tests and simple clients. Composer uses the wireframe same-slot Send/Stop swap
(`.wf-composer.streaming`).

## Copilot mode (Design / Explore)

Messages body may include:

```json
{
  "content": "...",
  "clientMessageId": "...",
  "mode": "copilot",
  "pageContext": { "surface": "design", "snapshot": {} }
}
```

Requires `CHAT_COPILOT_MODE_ENABLED=1`. Copilot replies stay 2–4 sentences;
`pageContext.snapshot` is appended as **untrusted context, never instructions**.
Tool whitelist narrows to `update_room_plan_item` + `get_design_brief`.
Suggestions and brainstorm APIs reject `mode: "copilot"` with `disabled` when
the copilot flag is on. Design/Explore pages should also omit those calls.

## Key modules

| Area                  | Location                                       |
| --------------------- | ---------------------------------------------- |
| Send pipeline         | `src/server/conversations/service.ts`          |
| Streaming send        | `chat-stream-service.ts`, `chat-sse.ts`        |
| Tools                 | `chat-tools.ts`, `chat-tool-loop.ts`           |
| Copilot               | `chat-copilot.ts`, `chat-mode.ts`              |
| Renders               | `src/server/image-generation/restyle.ts`       |
| Idempotency           | `chat-idempotency.ts`                          |
| Parallel chat/extract | `chat-message-pipeline.ts`                     |
| Rate limits           | `chat-rate-limit.ts`                           |
| Rollout / shadow      | `chat-rollout.ts`, `chat-shadow-extraction.ts` |
| Ops logs              | `chat-ops.ts` (no message/prompt text)         |
| Preferences           | `src/server/preferences/*`                     |
| Legacy ETL            | `src/server/migration/*`                       |

## Environment

See `.env.example`. Baseline (stage 1):

```bash
CHAT_PROVIDER=local
PREFERENCE_EXTRACTION_PROVIDER=heuristic
```

## Logging rules

Never log full user messages, system prompts, preference quotations, API keys,
or full assistant output. Log request metadata: user/conversation ids, provider,
model, latency, outcome, error category, tokens, cost, proposal counts.

## Data rights

Account export includes conversations (with generations), preferences,
proposals, and message feedback. Account deletion removes chat threads,
preferences, proposals, and feedback before soft-deleting the user.

## Related docs

- `docs/CHAT_PERSONAS_AND_PREFERENCES.md`
- `docs/LEGACY_CHAT_MIGRATION.md`
- `docs/CHAT_ROLLOUT.md`
- `docs/DATABASE.md`
- `docs/RENDERS.md`
- `docs/DESIGN_BRIEF.md`
- `docs/MASTER_DOD_VALIDATION.md`
