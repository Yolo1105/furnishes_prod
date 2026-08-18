# Design intelligence (Part 7)

Eva’s taste layer: expanded RAG corpus, style-conflict handling, and EXPLAIN
enforcement on recommendations.

## Taste review (required before treating corpus as final)

Founder judgment owns `config/design-docs/`. Review these twelve markdown files
before relying on them in production RAG:

| Doc                              | Topic               |
| -------------------------------- | ------------------- |
| `mid-century-modern.md`          | Style deep-dive     |
| `scandinavian.md`                | Style deep-dive     |
| `japandi.md`                     | Style deep-dive     |
| `industrial.md`                  | Style deep-dive     |
| `traditional-transitional.md`    | Style deep-dive     |
| `coastal.md`                     | Style deep-dive     |
| `color-theory-and-palettes.md`   | Color / palettes    |
| `material-and-texture-mixing.md` | Materials           |
| `lighting-layers.md`             | Lighting            |
| `small-space-strategies.md`      | Small spaces        |
| `cross-room-cohesion.md`         | Whole-home cohesion |
| `style-mixing-pitfalls.md`       | Mixing styles       |

Each doc targets ~600–900 words of practical designer guidance (pairings,
ratios, do/don’t). Re-seed after edits: `SEED_RAG=1 pnpm db:seed:rag`.

## Style-conflict guidance

Base chat prompt and preference-extraction prompt require Eva to **name** mixed
style signals, propose a **dominant/accent** resolution, and invite confirmation
as a preference — never silently pick one side. Eval: `style-conflict-named`.

## EXPLAIN on recommendations

`reasonWhyItFits` must cite ≥1 confirmed preference fragment. Heuristic check in
`explain-validation.ts`; on failure, regenerate once with a reinforced prompt
and emit ops event `recommendation_explain_retry` (`retryItemCount` only — no
preference text). Eval: `recommend-explain-user-facts`.

## Related docs

- `docs/CHAT_RAG.md` — retrieval runtime
- `docs/EVALS.md` — golden coverage including one RAG case per corpus topic
