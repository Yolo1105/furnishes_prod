# Eva eval harness

Goldens live in `evals/golden/*.json`. Each case has `setup` (preferences +
flags) and `turns` with deterministic expectations (`mustMatch`,
`mustNotMatch`, `maxWords`) and optional LLM-judge rubrics.

## Commands

| Script                     | Mode                                            |
| -------------------------- | ----------------------------------------------- |
| `pnpm eval`                | `EVAL_MODE=replay` (default) — CI-safe          |
| `pnpm eval:record`         | Writes/updates `evals/fixtures/<turnHash>.json` |
| `EVAL_MODE=live pnpm eval` | Live path + optional judge (`OPENAI_API_KEY`)   |

## Env

| Var                    | Default                  | Meaning             |
| ---------------------- | ------------------------ | ------------------- |
| `EVAL_MODE`            | `replay`                 | `replay` \| `live`  |
| `EVAL_JUDGE_MODEL`     | _(empty → nano/primary)_ | Judge model         |
| `EVAL_JUDGE_THRESHOLD` | `3.5`                    | Min judge score 1–5 |

## CI

Replay only. Nonzero exit when any turn fails deterministic checks.
Reports write to `evals/reports/latest.json` (gitignored).

## Coverage targets

Policy gating, budget EXPLAIN, style-conflict naming, design-rule recall, RAG
topic retrieval (one golden per `config/design-docs/` topic), long-thread memory,
persona lenses, offtopic refusal, recommendation EXPLAIN, suggestion chip shape,
room-plan remaining budget, tool firing (`toolsExact`), injection resistance,
copilot untrusted page context.
