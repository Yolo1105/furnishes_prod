# Studio

Two surfaces share the Studio name:

1. **Image-only pieces API** — flag-gated (`STUDIO_ENABLED=0` default off).
2. **Account Canvas playground** — the 3D studio at `/account/canvas`
   (`CANVAS_PLAYGROUND_ENABLED` default on).

## Account Canvas playground

Status: **Hosted in Account**. Source ported from `furnishes-playground-standalone`
into `src/features/account/canvas/playground/`.

Click **[03] Canvas** in the Account rail (Dashboard / Chat / Canvas tabs).
Canvas opens **full viewport** — no Account left rail, matching the standalone
playground. Default project is **Demo apartment** (`apartamento.glb` + seeded
catalog). **Blank Canvas** remains in the project switcher. Do not wrap the live
playground in the old “Coming soon” wireframe.

| Need                    | Env                             |
| ----------------------- | ------------------------------- |
| Page / 3D viewer        | Session cookie (Account layout) |
| Canvas chat dock        | `ANTHROPIC_API_KEY`             |
| Furniture / room meshes | `FAL_API_KEY` or `FAL_KEY`      |

Playground APIs (`/api/chat`, `/api/studio/projects*`, `/api/conversations*`,
generation routes) require an authenticated Account session
(`requirePlaygroundApiSession`) and persist playground projects and chat
threads in PostgreSQL. Canvas page access also requires session via Account
layout.

Set `CANVAS_PLAYGROUND_ENABLED=0` to restore the placeholder (inside Account chrome).

After pulling Canvas playground migrations, apply them to your dev database:

```bash
pnpm db:migrate
```

Playground Tailwind is scoped under `.furnishes-canvas-playground` and must
not restyle Landing or the Account shell on non-Canvas routes.

### Phase 3 — quality (done)

TypeScript checking is enabled across the Canvas playground by removing
`@ts-nocheck` from all API routes, `chat-brain/`, persistence, store slices,
`lib/` modules, and React components under `components/`. Run `pnpm typecheck`
to verify.

**Verification (Aug 2026):**

| Check             | Command                                    |
| ----------------- | ------------------------------------------ |
| TypeScript        | `pnpm typecheck`                           |
| Full CI gate      | `pnpm check`                               |
| Canvas unit tests | `pnpm vitest run src/server/canvas`        |
| Canvas e2e        | `pnpm test:e2e e2e/account-canvas.spec.ts` |

**Optional follow-up:** Knip still reports unused playground exports/types at
`warn` level (`knip.json` ignores playground `exports`/`types`). Tightening to
`error` requires a dedicated cleanup pass (~200 symbols).

## Image-only pieces API

Status: **Backend MVP**. UI deferred. Flag-gated (`STUDIO_ENABLED=0` default off).

### Scope

- Image-only studio pieces linked to ready `ImageGeneration` outputs
- Owner-scoped CRUD under `/api/account/studio/pieces`
- Lineage via optional `sourcePieceId` (re-derive / variant chain)

### Out of scope (this API)

- Fal.ai mesh / GLB generation (`@fal-ai` blocked; Canvas uses `fetch`)
- Product SKUs, cart, or commerce

Re-derived from legacy `FurnitureStudioPiece` and furniture generate **image stage only**
(`docs/legacy/production-domain-map.md`). Never pasted from legacy code.

### Flag

```env
STUDIO_ENABLED=0   # set to 1 to enable APIs
```

When disabled, all studio piece routes return `503` with error `disabled`.

### Routes

| Method | Path                                   | Description                            |
| ------ | -------------------------------------- | -------------------------------------- |
| GET    | `/api/account/studio/pieces`           | List owned pieces (`?cursor=`)         |
| POST   | `/api/account/studio/pieces`           | Create from ready generation or prompt |
| GET    | `/api/account/studio/pieces/[pieceId]` | Fetch one owned piece                  |
| PATCH  | `/api/account/studio/pieces/[pieceId]` | Update title                           |
| DELETE | `/api/account/studio/pieces/[pieceId]` | Remove piece (keeps generation)        |

All routes require an authenticated session (`requireApiSession`) and enforce
`userId` ownership on every read/write.

### Create body

Provide **either** `imageGenerationId` **or** `prompt`:

```json
{
  "imageGenerationId": "…",
  "title": "Optional title (max 200)",
  "sourcePieceId": "optional lineage parent"
}
```

```json
{
  "prompt": "Walnut side table with tapered legs",
  "projectId": "optional",
  "title": "Optional title"
}
```

- `imageGenerationId` path: generation must be `ready` with `outputUploadId`
- `prompt` path: starts image generation; piece is created only when the test/provider
  returns an immediately ready output (async linking deferred for MVP)

### Data model

`FurnitureStudioPiece` stores prompt, title, quality JSON (`{ image?, model? }`),
status (`completed` | `failed`), optional links to `ImageGeneration` and output
`Upload`, and optional `sourcePieceId` lineage.

Deleting a studio piece does **not** delete the underlying generation or upload.

### Modules

- `src/server/studio/studio-enabled.ts` — feature flag
- `src/server/studio/piece-schema.ts` — Zod validation
- `src/server/studio/piece-repository.ts` — Prisma access
- `src/server/studio/piece-service.ts` — business rules + audit events

### Tests

- `studio-enabled.test.ts` — flag default off
- `piece-service.test.ts` — ownership, validation, disabled gate (requires DB seed)
