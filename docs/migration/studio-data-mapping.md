# Studio ↔ Postgres data mapping

This document tracks how lifted **Furnishes Studio** client state maps to production models. It is a living reference for Phases 2, 9, and 12.

**Ops:** `STUDIO_ENABLED=0` turns off `/playground` and `/api/studio/*`. Fal-backed routes (`generate-asset`, `generate-room`, `arrange`) return **503** when `FAL_KEY` / `FAL_API_KEY` is unset (`lib/studio/server/studio-fal-config.ts`).

## Projects

| Studio UI / slice                               | Prod                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `projects-slice` list (`id`, `name`, `updated`) | `Project` (`id`, `title`, `updatedAt`) via `/api/studio/projects` |
| `currentProjectId`                              | Client selection; must match a `Project.id` the user can access   |

Demo `DEMO_PROJECTS` / `blank-test` IDs are **removed**; the shell calls `POST /api/studio/projects/ensure-starter` then `GET /api/studio/projects`.

## `/api/chat` from Playground

| Studio                                 | Eva                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `buildBrainPayload` → `studioSnapshot` | Parsed when `clientSurface` is **`CLIENT_SURFACE_STUDIO_RAIL`** (`lib/eva/api/chat-attachment.ts`)   |
| `Preference[]` in the store            | `preferencesToEvaRecord` → `preferences` as `Record<string,string>` (duplicate keys keep last value) |

## Eva Studio room saves (existing)

| Concept                                            | Prod                                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ProjectStudioRoomSave` + `ProjectStudioPlacement` | Eva furniture-3D / studio room pipeline (rigid schema: `roomShapeId`, dimensions, FK to `FurnitureStudioPiece`) |

Full **Furnishes Studio** snapshot is **not** stored in `ProjectStudioRoomSave` (that model stays for Eva 3D room **exports**). **Implemented:** `Project.playgroundClientSnapshot` stores `{ revision, snapshot }` with optimistic concurrency; **`GET`/`PUT` `/api/studio/projects/[id]/snapshot`** persist after Zod structural validation (`lib/studio/server/playground-persisted-schema.ts`). Client autosave mirrors to the server from `usePersistence` after IndexedDB writes.

## Ephemeral (no Postgres in v1)

Tour UI state, undo/history, UI flags, card positions, transient selection, `scene-source` scratch—keep client-only or debounce to IDB cache only unless product requires sync.

## IndexedDB (`lib/studio/persistence`)

Mirrors project blobs for fast local paint. **Server:** on hydrate, if the server snapshot’s `updatedAt` is newer than the local IDB copy, the client applies the server blob and rewrites IDB. **Conflict:** `PUT` returns **409** with `currentRevision` when `expectedRevision` is stale; the client updates its revision map so the next debounced save succeeds.
