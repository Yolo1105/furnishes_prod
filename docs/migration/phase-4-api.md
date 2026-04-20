# Phase 4 — Essential Eva API routes (done)

## Routes

| Method   | Path                      | Purpose                                                                                                                                  |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/api/chat`               | Streaming assistant reply; creates conversation if needed; persists messages; rate/cost limits; policy + design rules + RAG hook (stub). |
| `POST`   | `/api/extract`            | Structured preference extraction + DB updates (full pipeline from reference).                                                            |
| `GET`    | `/api/conversations`      | Paginated list (`userId: null` until NextAuth).                                                                                          |
| `GET`    | `/api/conversations/[id]` | Conversation + messages.                                                                                                                 |
| `DELETE` | `/api/conversations/[id]` | Delete conversation.                                                                                                                     |

Spike routes remain under `/api/eva/*` (`ping`, `health`, `stream-ping`).

## Supporting modules added / copied

- `lib/eva/api/error.ts` — `apiError`, `ErrorCodes`
- `lib/eva/domain/fields.ts` — `getFieldIds`, `getFieldLabel`
- `lib/eva/auth/helpers.ts` — `requireConversationAccess` (no NextAuth yet: only conversations with `userId: null` are accessible anonymously)
- `lib/eva/design-rules/` — clearances, rug sizing, layout planner, `lookupDesignRule`
- `lib/eva/policy/` — intent + `checkPolicy`
- `lib/eva/extraction/` — full extraction stack from reference
- `lib/eva/feedback/implicit-signals.ts`
- `lib/eva/rag/retriever.ts` — cosine-similarity retrieval over **`DesignDoc`** rows (returns `[]` if no seeded embeddings — run **`npm run db:seed:rag:embed`** opt-in)

## Requirements

- **`DATABASE_URL`** + migrations applied (`npm run db:migrate:deploy`).
- **`OPENAI_API_KEY`** (or **`OPENROUTER_API_KEY`**) for `/api/chat` and `/api/extract`.

## Next phases

- **Phase 5 — Dashboard UI:** done — see **`phase-5-dashboard.md`**.
- **Phase 6 — Launch hardening:** current — see **`phase-6-launch.md`** (deploy, env, RAG seed, Milestone B QA).
