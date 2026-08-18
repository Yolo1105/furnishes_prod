# Conversation insights and share links

Phase 8 Part F — re-derived from legacy Discover insights and `SharedProject`
share links.

## Insights

| Env                     | Default | Meaning       |
| ----------------------- | ------- | ------------- |
| `CHAT_INSIGHTS_ENABLED` | `0`     | Master switch |

- Route: `GET /api/account/conversations/:id/insights` (session + ownership)
- Gate: fewer than 3 messages → empty arrays + `insightsReady: false`
- No OpenAI key → `insightsUnavailable: true` (honest empty)
- LLM failure → `503 provider_unavailable` (never disguised as empty success)
- CostLog kind: `insight`
- Never log message text

Module: `src/server/conversations/chat-insights.ts`

## Share links

| Env                   | Default   | Meaning                        |
| --------------------- | --------- | ------------------------------ |
| `CHAT_SHARE_ENABLED`  | `0`       | Master switch                  |
| `SHARE_LINK_TTL_DAYS` | `7`       | Link lifetime (clamped 1–365)  |
| `PUBLIC_APP_URL`      | _(empty)_ | Absolute origin for `shareUrl` |

**Product decisions (this repo):**

1. TTL defaults to **7 days** (legacy was 30).
2. Anonymous readers get **title + messages** only — **no preference values**
   (legacy returned preference field/value cards instead of messages).

| Method   | Route                                                                       |
| -------- | --------------------------------------------------------------------------- |
| `POST`   | `/api/account/conversations/:id/share` → `{ shareUrl, shareId, expiresAt }` |
| `DELETE` | same — revoke all links for the conversation                                |
| `GET`    | `/api/shared/:shareId` — anonymous JSON                                     |
| Page     | `/shared/:shareId` — read-only HTML                                         |

Expired or missing links → 404. Schema: `SharedProject`.

Module: `src/server/conversations/chat-share.ts`

## Deferred

User-to-user `ConversationShare` (read/comment/edit permissions) is not ported.
