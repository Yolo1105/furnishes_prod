# Furniture generation (text → 2D → 3D) — architecture

Short reference for **safe iteration** on Studio’s furniture pipeline. Shared types live under `types/` (`generation`, `furniture-session`, `room`).

## Data flow

1. **Prompt** — User text in `ImageGenWorkspace` (`components/eva-dashboard/account/image-gen/image-gen-workspace.tsx`). Quality + model checkboxes map to options via `deriveGenerateOptions` (`lib/furniture-gen/derive-options.ts`).

2. **HTTP** — `POST /api/furniture/generate` (`app/api/furniture/generate/route.ts`): auth, rate limit, optional `FurnitureGeneration` audit row, then streams **SSE** lines `data: <JSON>\n\n`.

3. **Server pipeline** — `generate()` in `lib/furniture-gen/pipeline.ts` yields **`Progress`** events (`types/generation.ts`): `expanding` → `image_ready` (image URL) → `meshing` → `done` (image + GLB URLs) or `error`.

4. **Providers** — `GenerationProvider` (`lib/furniture-gen/providers/interface.ts`): LLM expand → `textToImage` → `imageToMesh`. Default implementation: `FalProvider` (`lib/furniture-gen/providers/fal.ts`).

5. **Client** — Workspace parses SSE, updates **filmstrip** state (`FilmRow` in `types/furniture-session.ts`), drives solo **2D/3D** preview.

6. **3D solo view** — `GlbViewer` (`components/furniture-gen/glb-viewer.tsx`) + `ClonedGltfPrimitive` for a single GLB.

7. **Room preview** — `RoomFurnitureScene` (`components/furniture-gen/room-furniture-scene.tsx`) places one or more GLBs (`RoomPlacement` in `types/room.ts`) on a simple floor/back wall with Drei `Environment`; layout is **linear spacing along X**, not full floor-plan solving.

## Page / component boundaries

| Area                                     | Role                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Account image-gen workspace              | Orchestrates prompt, SSE client, filmstrip, tab switch Generate ↔ Arrange, room dimensions & placements. |
| Legacy `/tools/furniture-3d` routes      | Redirect to `/account/image-gen` (and `?tab=arrange` for room).                                          |
| `GlbViewer`                              | Single-mesh orbit preview with health check (`glb-utils.ts`).                                            |
| `RoomFurnitureScene`                     | Multi-GLB room preview; receives meters, colors, Drei lighting preset.                                   |
| `app/(site)/room-planner/page.tsx`       | **Placeholder** — not wired to this pipeline.                                                            |
| `lib/eva/design-rules/layout-planner.ts` | **Different domain**: inch-based room layout options for Eva chat — **not** the Studio GLB room scene.   |

## Core logic to keep stable (unless deliberately changing the product contract)

- **`lib/furniture-gen/pipeline.ts`** — stage sequence and `Progress` shape (clients and audit depend on it).
- **`lib/furniture-gen/providers/*`** — Fal endpoints, retries, error mapping.
- **`app/api/furniture/generate/route.ts`** — SSE format, status codes, rate limits, audit updates.
- **`prisma` `FurnitureGeneration` model** — fields tied to `requestId`, URLs, status.
- **`components/furniture-gen/*` viewer primitives** — GLB loading/cloning behavior.
- **`lib/furniture-gen/derive-options.ts`** — mapping UI tier + checkboxes → `GenerateOptions`.

## Type modules

- **`types/generation.ts`** — `Progress`, `GenerateOptions`, `GenerationQuality`, `MeshModelId` (API body typing lives with the route’s Zod schema).
- **`types/furniture-session.ts`** — Studio UI session: `PipelinePhase`, `FilmRow`, `FilmRowStatus`.
- **`types/room.ts`** — `RoomPlacement`, `RoomDreiEnvironmentPreset`.

`lib/furniture-gen/mesh-model.ts` re-exports `MeshModelId` for existing `lib/` import paths.

## Eva Studio shell (image-gen UI)

Default layout composition: **`StudioWorkspaceShell`** (applies `.eva-studio`) → **`StudioLeftRail`** + **`StudioHeroPanel`** with **`StudioTopChrome`**, canvas, and **`StudioBottomActionStrip`**. Section titles use **`StudioSectionLabel`** (optional `meta` for counts). Visual details are driven by `--eva-studio-*` tokens in `app/globals.css` and `.eva-dashboard-root .eva-studio` in `app/(chromeless)/account/account-theme.css`, not ad hoc neutrals or black/white overlays.
