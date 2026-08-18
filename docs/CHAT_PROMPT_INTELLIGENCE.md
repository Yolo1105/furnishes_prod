# Chat prompt intelligence

Per-turn system-prompt enrichment for Account Eva chat. Re-derived from legacy
Eva core helpers; no new dependencies and no schema changes.

## What ships

| Module                                                   | Role                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/server/conversations/chat-critical-facts.ts`        | Same-turn regex facts (budget, room, dimensions, counts, hard constraints, exclusions, style/material cues)                     |
| `src/server/conversations/chat-response-length.ts`       | Adaptive length instruction from the latest user message                                                                        |
| `src/server/conversations/design-rules.ts`               | Deterministic clearance / rug / dining / TV tables; `lookupDesignRules` only when layout keywords fire                          |
| `src/server/conversations/chat-prompt.ts`                | Assembles persona + memory + the above appendices                                                                               |
| `src/server/preferences/preference-extraction-openai.ts` | Extraction system prompt includes legacy alias/normalization guidance mapped to `room \| budget \| style \| color \| furniture` |

## Behavior notes

- Critical-fact and design-rule blocks are omitted when empty / non-triggering so
  ordinary turns stay lean.
- Response-length guidance is always the final line when a user message is
  available.
- Legacy layout-planner graph planning and preference fields such as
  `roomWidth` / `doorPositions` are not ported here (later phases).
