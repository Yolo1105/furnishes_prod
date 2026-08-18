# Chat side features + policy

## Flags

| Flag                         | Default      | Effect                                                                  |
| ---------------------------- | ------------ | ----------------------------------------------------------------------- |
| `CHAT_SIDE_FEATURES_ENABLED` | `0`          | Suggestions / brainstorm / recommendations return 503 when off          |
| `CHAT_POLICY_GATING_ENABLED` | `1`          | Short-circuit layout/shopping/furniture asks until required facts exist |
| `AI_STRUCTURED_MODEL`        | chat primary | Model for JSON side-feature calls                                       |

## Routes

- `POST /api/account/conversations/:id/suggestions` → 3–5 next-message chips
- `POST /api/account/conversations/:id/brainstorm` → 3 idea paragraphs
- `GET|POST /api/account/conversations/:id/recommendations` → list / regenerate / save

All require `requireApiSession` + conversation ownership. Structured LLM calls go
through `src/server/structured-output/generate-structured.ts` and record `CostLog`
kinds `suggestion` | `brainstorm` | `recommendation`.

Recommendations describe design archetypes (never Product SKUs). Save marks the
row `saved` and creates a note-only Inspiration Board item.

## Policy

`src/server/conversations/chat-policy.ts` detects intents and requires:

- layout → room + `StyleProfile.roomDimensions`
- shopping list → budget
- furniture recs → room

When blocked, chat persists the clarification as the assistant message (no LLM).
