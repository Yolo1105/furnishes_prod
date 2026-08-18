# Chat context summary

Rolling summaries compress older turns so long conversations stay within model
context without dropping recent detail.

## Flag

| Env                        | Default                            | Meaning                                            |
| -------------------------- | ---------------------------------- | -------------------------------------------------- |
| `CHAT_SUMMARY_ENABLED`     | `0`                                | Master switch                                      |
| `CHAT_SUMMARY_THRESHOLD`   | `20`                               | Minimum messages before summarization can run      |
| `CHAT_SUMMARY_KEEP_RECENT` | `12`                               | Recent messages kept verbatim in the prompt window |
| `CHAT_SUMMARY_MAX_CHARS`   | `2400`                             | Stored summary cap                                 |
| `CHAT_SUMMARY_MODEL`       | _(empty → `resolveModel("chat")`)_ | OpenAI model for summary calls                     |
| `CHAT_SUMMARY_TIMEOUT_MS`  | `20000`                            | Fetch timeout                                      |

## Module

`src/server/conversations/chat-context-summary.ts`

| Export                            | Role                                                                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `shouldRefreshContextSummary`     | Pure gate: enabled + threshold + ≥8 new messages since last `contextSummaryUpTo`                                                          |
| `buildHistoryWindow`              | Chooses summary block + recent slice (or fallback last 40)                                                                                |
| `formatContextSummaryPromptBlock` | Delimited prompt section for the system stack                                                                                             |
| `maybeRefreshContextSummary`      | Loads conversation, summarizes `[0 .. length-KEEP_RECENT)`, persists `Conversation.contextSummary*` fields, records `CostLog` kind `chat` |

## Schema

`Conversation.contextSummary`, `contextSummaryUpTo`, `contextSummaryUpdatedAt`
(migration `add_conversation_summary`).

## Wiring

Both `service.ts` and `chat-stream-service.ts` call
`resolveChatSendPromptExtras` (history window + optional summary block). The
summary block lands in prompt slot **(6)** after Part 2's cache-friendly
reorder. `scheduleContextSummaryRefresh` runs **only after a successful
assistant persist** (including the new assistant turn in the message list) so
failed/aborted replies do not spend summary tokens and summarization does not
extend perceived latency. Flag-off keeps the prior last-40 history behavior and
omits the prompt block (byte-identical). Never log message text on failure —
only counts/lengths via `[ops] context_summary_failed`.

## Manual validation

With flags on for a throwaway env:

1. Send 25+ messages with an early constraint (budget / avoid material) — after
   refresh, the system prompt should include `CONVERSATION MEMORY` covering that
   early constraint while recent turns stay verbatim.
2. Open a second conversation on the same project — with project memory on, the
   prompt should reference sibling summary / timeline / prefs without raw
   message text.
3. Restate a **pending** proposal value with preference language — expect
   `[ops] implicit_signal` type `restate_pending_proposal` (no message text).
4. `GET /api/account/preferences/calibration` returns banded
   `{ total, accepted, acceptanceRate }` rows (or `{ report: [] }` when empty).

## Privacy

Summaries are stored on the conversation row. Ops logs must never include summary
text or message bodies.
