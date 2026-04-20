# Phase 3 — Eva `lib/core` + domain config (done)

## What was added

### `config/domain.json`

Eva domain: `system_prompt`, `fields`, `guardrails`, `conversation` limits, `rate_limits`, etc. (ported from `chatbot_v3`).

### `lib/eva/core/`

| Module                               | Role                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `env.ts`                             | `getEvaEnv()`, `BUILD_PLACEHOLDER_DATABASE_URL` for CI/Vercel builds                             |
| `db.ts`                              | `PrismaClient` singleton + build-time placeholder proxy when `DATABASE_URL` is absent in CI      |
| `openai.ts`                          | `@ai-sdk/openai` factory, OpenRouter support, pricing, `requireOpenAIKey`, `withFallback`        |
| `constants.ts`                       | `VIEW_IDS`, timing defaults, mock workspace/project/assistant                                    |
| `logger.ts`                          | Structured `pino` logging                                                                        |
| `security-logger.ts`                 | Security event logging                                                                           |
| `guardrails.ts`                      | Injection checks, moderation API, `sanitizeOutput`, stream sanitization, `buildSafeSystemPrompt` |
| `rate-limit.ts`                      | DB-backed `RateLimitEvent` sliding window                                                        |
| `cost-logger.ts` / `cost-tracker.ts` | `CostLog` persistence + session cap vs `domain.json`                                             |
| `response-length.ts`                 | Adaptive length hints for prompts                                                                |
| `context-builder.ts`                 | Token-aware history + optional summarization (`messagesToTranscript` via helpers)                |
| `index.ts`                           | Re-exports                                                                                       |

### `lib/eva/domain/config.ts`

`getDomainConfig()` reads `config/domain.json` (fallback defaults if missing).

### `lib/eva/api/helpers.ts`

`messagesToTranscript`, `getPreferencesAsRecord` (shared with future `/api/chat`).

### `lib/eva/types.ts`

`ViewId` union for dashboard navigation.

### `lib/eva/db.ts`

Re-exports `prisma` from `core/db` (same entry as Phase 1–2 seeds and `/api/eva/health`).

### Dependency

- **`pino`** — structured logs.

## Intentional differences vs `chatbot_v3`

- **Prisma 6** with a **single** `@prisma/client` (no Prisma 7 adapters, no SQLite fallback in `db.ts`).
- **`getEvaEnv()`** is available for strict validation; **`lib/eva/core/db.ts`** uses **`process.env.DATABASE_URL`** directly so `next build` works without a populated `.env` locally.
- **`src/`** layout replaced by **`lib/eva/**`** and `@/\*` imports.

## Next (Phase 4)

Wire **`/api/chat`**, **`/api/extract`**, and conversation routes using these modules.
