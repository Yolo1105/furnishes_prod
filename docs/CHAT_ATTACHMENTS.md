# Chat attachment grounding

Users can attach existing private uploads to a chat message. Eva grounds on a
short factual vision summary in the system prompt.

## Flag

| Flag                              | Default                      | Effect                                      |
| --------------------------------- | ---------------------------- | ------------------------------------------- |
| `CHAT_ATTACHMENTS_ENABLED`        | `0`                          | When off, `attachmentUploadIds` are ignored |
| `CHAT_VISION_MODEL`               | chat primary / `gpt-4o-mini` | Vision chat-completions model               |
| `ATTACHMENT_GROUNDING_TIMEOUT_MS` | `15000`                      | Per-image vision timeout                    |

## API

`POST /api/account/conversations/:id/messages` body may include:

```json
{ "attachmentUploadIds": ["cuid…"] }
```

Max 3 ids. Each upload must belong to the session user, be `ready`, and be
JPEG/PNG/WebP. Foreign ids → 403.

## Grounding

`src/server/conversations/chat-attachment-grounding.ts` reads bytes via
`getPrivateStorage()`, calls OpenAI vision via raw `fetch`, truncates to ≤600
chars, and appends an `Attached images` block to the system prompt. Failures
degrade to `(image attached; analysis unavailable)`. CostLog `kind: "vision"`.
Never logs image bytes or summary text.
