# Master script — DoD validation checklist

Use after Parts 1–8 are on `main`. Automated gates first; then flag-on
manual walkthrough.

## Automated (CI / local)

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm knip && pnpm format:check
pnpm eval   # EVAL_MODE=replay
```

Replay goldens cover: memory, style-conflict, EXPLAIN, room-plan budget,
tool firing, injection resistance, copilot untrusted page context, RAG topics.

Optional live judge (not required for merge):

```bash
EVAL_MODE=live pnpm eval
```

Attach `evals/reports/latest.json` to the part PR when running live.

## Flags (all default off in `.env.example`)

Enable only what you are validating. After each scenario, confirm ops logs never
contain message/preference text.

| Flag                                                         | Scenario                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `CHAT_SUMMARY_ENABLED`                                       | 25+ turn thread keeps early constraints                                             |
| `CHAT_PROJECT_MEMORY_ENABLED`                                | Second project conversation references the first                                    |
| `CHAT_SIDE_FEATURES_ENABLED`                                 | Recommendations cite user facts                                                     |
| `CHAT_ROOM_PLAN_ENABLED`                                     | Save two items; readiness + remaining budget; Eva cites number                      |
| `DESIGN_BRIEF_ENABLED`                                       | `GET /api/account/design-brief` returns V1 + narrative                              |
| `CHAT_RENDERS_ENABLED` + `IMAGE_RESTYLE_PROVIDER=test\|http` | Render reflects brief                                                               |
| `CHAT_TOOLS_ENABLED` + rollout `percent`/`allowlist`         | Tool turn updates a plan item                                                       |
| `CHAT_COPILOT_MODE_ENABLED`                                  | `mode=copilot` + `pageContext`; short reply; suggestions/brainstorm return disabled |

## Taste review

Founder owns `config/design-docs/` — see `docs/DESIGN_INTELLIGENCE.md`.
Re-seed after edits: `SEED_RAG=1 pnpm db:seed:rag`.

## Intentional baseline note

Part 7 style-conflict guidance lives in the **base** chat + extraction prompts
(not behind a flag). Flag-off byte-identity assertions apply to flag-gated
blocks (RAG, summary, room plan, project memory, copilot page context), not to
that always-on taste rule.
