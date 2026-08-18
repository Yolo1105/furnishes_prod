# Chat RAG

Design-knowledge retrieval appended to Eva’s system prompt when enabled.

## Flag

`CHAT_RAG_ENABLED=0` (default). Set to `1` after seeding `DesignDoc` rows.

## Corpus

Markdown under `config/design-docs/` (~12 practical designer docs: style
deep-dives, color, materials, lighting, small spaces, cohesion, mixing
pitfalls). See `docs/DESIGN_INTELLIGENCE.md` for the taste-review checklist.
Chunk + embed with:

```bash
SEED_RAG=1 pnpm db:seed:rag
```

Requires `OPENAI_API_KEY`. Model: `RAG_EMBEDDING_MODEL` (default
`text-embedding-3-small`). Query embeddings record `CostLog` kind `embedding`
when a user id is available.

## Runtime

`resolveChatSystemPrompt` calls `retrieveRelevant` → cosine pre-rank → lexical
rerank → quality (`strong|weak|none|unavailable`) → optional
`Reference knowledge` block. Flag-off prompts are byte-identical to Phase 1
(no block). Ops event `chat_rag_retrieval` logs quality + hit count only.

## Cache

In-process TTL (~60s) keyed by `DesignDoc` count + max(`createdAt`). Not a
whole-table forever cache; swap point for pgvector later.
