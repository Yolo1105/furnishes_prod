# Architecture

One document. If a rule is not here, it is not a rule.

## What this repository is

A single deployable Next.js application (no monorepo). It ships **Landing**
and a protected **Account** surface with credential auth. There is no Products
surface and none is planned.

```
src/app/            Next.js App Router (routes, layout, health, auth/account APIs)
src/features/       One folder per surface (landing/, account/, auth/)
src/components/     Shared chrome only (public-shell)
src/lib/contracts/  Non-visual shared minimum: route builders + domain types
src/server/         Auth, persistence services, HTTP helpers (Phase 2+)
prisma/             Minimal PostgreSQL schema + migrations for Auth/Account
reference/          Frozen approved designs (hash-verified, never imported)
docs/               This file, ROADMAP, PROVENANCE, legacy behavioral maps
e2e/                Playwright specs
scripts/            check-reference-integrity.mjs, E2E runner/seed helpers
```

## Durable rules

1. **Frozen designs are evidence, not code.** Files under `reference/` are the
   approved visual truth (`landing.jsx`, `account.jsx`, version `2026-07-16`,
   sha256 in each `source-manifest.json`). They are never edited in place and
   never imported into production code (lint-enforced). A new approved design
   is added as a new dated directory, never overwritten. The Phase 2 Account UI
   also consults the approved Account visual direction (including newer
   refactor drafts used as specifications only).
2. **No premature design system.** Landing and Account are independent visual
   expressions. Do not create shared color palettes, typography scales,
   spacing systems, or a UI kit across surfaces. Cohesion comes from the
   shared minimum below; anything more must first prove itself identical in
   both shipped surfaces.
3. **The shared minimum is `src/lib/contracts/`:** route builders, domain
   types, and auth-related route constants. It is framework-free
   (lint-enforced) and contains nothing visual.
4. **Deferred domains stay out until introduced deliberately.** Payments,
   first-party AI SDKs (openai npm), Redis, and Sentry/APM remain lint-blocked
   until logged here. Custom OpenAI fetch adapters, Prisma, nodemailer,
   `@aws-sdk/client-s3`, and structured ops logging are already introduced.
   Legacy code is a behavioral reference, never a copy source. Commerce shipped
   in Phase 6 (`docs/COMMERCE.md`) **without** lifting the payment blocklist:
   Stripe is reached over its REST API with `fetch` plus `node:crypto`, so
   `stripe` / `@stripe/*` stay blocked and uninstalled.
5. **Three.js:** Landing pins `three-landing` (`three@0.150.x`) because the
   approved design uses the pre-r152 color API (`sRGBEncoding` /
   `outputEncoding`). Account Canvas uses `three@0.185` with
   `@react-three/fiber` + `@react-three/drei`. Never import Landing's
   `three-landing` from Canvas or vice versa.
6. **Dead code is a CI failure.** `knip` runs in `pnpm check` and CI.
7. **Landing E2E is the regression gate** for any change to
   `src/components/public-shell/` or `src/features/landing/`.
8. **The public shell is surface-neutral.** It navigates via destination
   tokens parameterized by each surface (`PublicMenu` / `PublicShell`
   generics) and never imports surface-owned types; each surface narrows
   tokens at its own boundary (`isLandingDestination` in Landing).
9. **`/` stays statically renderable.** Test-only query params are read
   client-side (`LandingEntry` behind Suspense); nothing may reintroduce
   server-side `searchParams` on the homepage.
10. **Indexing is environment-controlled.** `NEXT_PUBLIC_ALLOW_INDEXING=1`
    at build time enables crawling; default blocks it.
11. **Account authorization is server-side.** Cookies are HTTP-only; session
    and email tokens are stored digest-only, keyed with `AUTH_SECRET` (HMAC), so
    rotating that secret invalidates every session and pending email link.
    Private resources check ownership on the server. Client UI never replaces
    authorization.

## Phase 2 introductions (re-derived from legacy)

| Dependency / area      | Legacy behavior re-derived from                                                                          | Notes                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prisma + PostgreSQL    | `User`, `Session`, `VerificationToken`/`PasswordReset`, profile/budget, conversations, projects, uploads | Minimal schema only — not the legacy 90-model dump                                                                                                              |
| Custom session auth    | `app/api/auth/*` credentials + sessions                                                                  | scrypt password KDF; `AUTH_SECRET`-keyed digest-only session/email tokens; rate limits; enumeration-resistant recovery copy. NextAuth is intentionally not used |
| Local email adapter    | verification / reset mail                                                                                | Logs when SMTP unset; nodemailer when `SMTP_HOST` is set (`docs/PRODUCTION_PROVIDERS.md`)                                                                       |
| Private upload storage | private uploads / generated assets                                                                       | `STORAGE_PROVIDER=local\|s3` — local `.data/uploads` or S3/R2; no malware scanning claimed                                                                      |
| Local chat adapter     | conversations / assistant                                                                                | Deterministic fallback reply — OpenAI fetch adapters when configured                                                                                            |
| Chat personas + memory | Eva assistants + preference extraction (legacy behavioral reference only)                                | Account-level persona + pending preference proposals. See `docs/CHAT_PERSONAS_AND_PREFERENCES.md`                                                               |
| Chat streaming         | Account chat composer                                                                                    | SSE `stream: true` + Stop; partial `stopped` messages. See `docs/CHAT_BACKEND_INTEGRATION.md`                                                                   |
| Image generation       | Account workspace                                                                                        | Provider adapters (`disabled` / `test` / `http`); private generated uploads. See `docs/IMAGE_GENERATION.md`                                                     |
| Waitlist persistence   | Landing waitlist                                                                                         | `POST /api/waitlist` → `WaitlistSignup`; demo local-parts retained for tests                                                                                    |
| Inspiration Board      | Product-free Shortlist replacement                                                                       | Generated + uploaded visuals with notes/projects. See `docs/INSPIRATION_BOARD.md`                                                                               |
| Account hardening      | Auth rate limits, sessions, password change, audit retention                                             | Configurable IP+account limits; Settings sessions; `pnpm auth:purge-retention`. See `docs/ACCOUNT_HARDENING.md`                                                 |
| Deployment / ops       | Standalone image, readiness, backups                                                                     | `output: "standalone"`, Dockerfile, `/api/health?ready=1`, `[ops]` logs. See `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`                                         |

## Phase 3 introductions

| Dependency           | Why                                                          |
| -------------------- | ------------------------------------------------------------ |
| `nodemailer`         | Production SMTP path when `SMTP_HOST` is provisioned         |
| `@aws-sdk/client-s3` | S3-compatible private object storage (`STORAGE_PROVIDER=s3`) |

## Phase 5 introductions

No new npm dependencies. Hardening reuses Prisma `SecurityEvent` /
`AuthRateLimit` / `Session` and the existing email adapter.

## Phase 6 introductions

No new npm dependencies. Ops uses structured stdout JSON, Prisma readiness
checks, and Next `output: "standalone"` for container deploys. Sentry remains
lint-blocked until a follow-up wires the SDK.

Boot preflight (`src/server/ops/preflight.ts`, invoked from
`src/instrumentation.ts`) fails start on invalid flag combos (notably
`CHAT_RENDERS_ENABLED=1` with `IMAGE_RESTYLE_PROVIDER=disabled`) and warns when
`CHAT_RAG_ENABLED=1` with zero `DesignDoc` rows. Capability rollout stages:
`docs/ROLLOUT_PLAN.md`. Quiz ingest has no flag (rate-limited API).

## Master script — Part 8 (renders, tools, copilot)

Room restyle img2img (`CHAT_RENDERS_ENABLED`, `IMAGE_RESTYLE_PROVIDER=disabled`,
`docs/RENDERS.md`); chat tool whitelist + rollout
(`CHAT_TOOLS_ENABLED`, shadow→allowlist→percent, SSE `tool_activity`); copilot
mode on messages (`mode: full|copilot`, untrusted `pageContext`,
`CHAT_COPILOT_MODE_ENABLED`). CostLog kind `image`. Daily cost rollup includes
`cacheHitRatio` + `costByKind`. Spatial tools remain absent (Room-Health
validator is a future reference only). Validation checklist:
`docs/MASTER_DOD_VALIDATION.md`.

## Master script — Part 7 (design intelligence)

Expanded RAG corpus (~12 docs in `config/design-docs/`; taste review checklist in
`docs/DESIGN_INTELLIGENCE.md`), style-conflict guidance in base chat + extraction
prompts, and EXPLAIN enforcement on recommendations (heuristic user-fact
citation with one retry + `recommendation_explain_retry` telemetry). One eval
golden per corpus topic plus existing style-conflict and recommend-EXPLAIN
cases. See `docs/DESIGN_INTELLIGENCE.md` and `docs/CHAT_RAG.md`.

## Master script — Part 6 (DesignBrief export)

`DesignBriefV1` handoff from Chat → Design (`src/lib/contracts/design-brief.ts`).
Builder `getDesignBrief` assembles preferences + optional RoomPlan + readiness +
Eva narrative (`CostKind` `"brief"`). Flag `DESIGN_BRIEF_ENABLED=0`. Route
`GET /api/account/design-brief?roomPlanId=`; chat intents (“my brief”,
“summarize my design plan”) return the narrative on sync and stream paths. See
`docs/DESIGN_BRIEF.md`.

## Master script — Part 5 (Room Plan + orderable score)

`RoomPlan` / `RoomPlanItem` (migration `add_room_plan`) with deterministic budget
bands (`budget-allocator.ts`) and readiness score (`readiness.ts`: core 60 /
secondary 20 / budget 10 / style+color 10). Flag `CHAT_ROOM_PLAN_ENABLED=0`;
order CTA copy behind `ROOM_PLAN_ORDER_CTA_ENABLED=0`. APIs under
`/api/account/room-plans`; chat prompt block after workflow; workflow refine
gate also when ≥50% core items decided. Dimension columns stored unused
(spatial deferred). Orderable score ships ahead of commerce by design. See
`docs/ROOM_PLAN.md`.

## Master script — Part 4 (project memory, implicit signals, calibration)

Cross-conversation project ground truth, behavioral preference signals, and
proposal-outcome calibration (Phase 8 Parts C–E). Flags default off except the
read-only calibration endpoint.

| Capability       | Module(s)                                                                                                                                          | Flag / access                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Project memory   | `project-memory.ts`, `project-memory-prompt.ts`; chat slot (4) + recommendations appendix                                                          | `CHAT_PROJECT_MEMORY_ENABLED=0`   |
| Implicit signals | `implicit-signals.ts` (`restate_preference`, `restate_pending_proposal`, `preference_removal`, `style_change_after_rec`); `ImplicitSignal` table   | `CHAT_IMPLICIT_SIGNALS_ENABLED=0` |
| Calibration      | `calibration.ts` + `GET /api/account/preferences/calibration` (banded acceptance + restate-pending trust column); replaces legacy `CalibrationLog` | session-scoped, always on         |

See `docs/PROJECT_MEMORY.md` and `docs/CHAT_PERSONAS_AND_PREFERENCES.md`.

## Master script — Part 3 (conversation summarization)

Rolling long-chat memory: `Conversation.contextSummary*` (migration
`add_conversation_summary`) + `src/server/conversations/chat-context-summary.ts`.
Gated by `CHAT_SUMMARY_ENABLED=0`. Refresh when message count ≥
`CHAT_SUMMARY_THRESHOLD` (default 20) and ≥8 messages past
`contextSummaryUpTo`; keeps `CHAT_SUMMARY_KEEP_RECENT` (12) verbatim; rolling
update prompt when a prior summary exists; `CostLog` kind `chat`; silent
failure with length-only ops logs. Prompt slot (6) via
`contextSummaryBlock`. Model: `CHAT_SUMMARY_MODEL` or `resolveModel("chat")`.
See `docs/CHAT_CONTEXT_SUMMARY.md`.

## Master script — Part 2 (evals, prompt cache order, strict schemas, routing)

Eval harness: `evals/` + `pnpm eval` (replay default for CI; live + judge
optional). See `docs/EVALS.md`.

`buildChatSystemPrompt` / `assembleChatSystemPrompt` use a cache-friendly
order (stable prefix first: base → persona → design rules → project memory →
workflow → summary → RAG → attachments → critical facts → length). Ops logs
`prompt_prefix_stable_chars`; OpenAI `prompt_tokens_details.cached_tokens`
are recorded when present; daily rollup accepts optional cache-hit ratio.

Structured generation uses OpenAI `json_schema` strict mode via
`src/server/structured-output/zod-to-json-schema.ts` (every object node has
`additionalProperties: false` and all keys in `required`; optionality is
expressed as nullable unions). Task-aware model selection lives in
`src/server/model-routing/model-router.ts` (path deviates from the master
script's `src/server/ai/model-router.ts` so ESLint's blocked `ai` package
pattern does not match imports). `generateStructured` honors
`AI_STRUCTURED_MODEL` when set, otherwise `resolveModel("structured")`.

## Master script — Part 1 (cost choke point)

Structured generation enforces `checkCostAllowance` when `costContext` is set
(`enforceCaps` defaults true) and throws `CostLimitError` before any provider
fetch. Suggestions, brainstorm, recommendations, and insights map that to
`cost_limit` → HTTP 429. `logDailyCostRollup` accepts injectable
`getDailyGlobalCostUsd` so unit tests stay DB-free.

## Deferred — spatial track

Fit-check engine, room geometry, photo dimension capture, 2D floor plans
(`LayoutPlan`), furniture-dimension tables, spatial tools, and checkout wiring
are **deferred**. The 3D studio is Account Canvas (Phase 15), which is not
this spatial-track work. Future primary reference for fit-check: legacy
Room-Health validator. Dimension fields may exist on room-plan rows for later
use but must not drive spatial logic in this track.

**Unit note:** critical-facts / `StyleProfile.roomDimensions` still use **feet**
(`widthFeet` / `lengthFeet`). `RoomPlanItem` columns are **cm** for the future
spatial track. Normalize at the boundary when fit-check resumes — do not mix
units in one calculation.

## Phase 7 introductions — prompt intelligence

No new npm dependencies or schema changes. Per-turn prompt quality re-derived
from legacy `lib/eva/core/critical-turn-extraction.ts`,
`lib/eva/core/response-length.ts`, `lib/eva/design-rules/*`, and extraction
pattern text in `config/domain.json`. Wired through
`src/server/conversations/chat-prompt.ts` (critical facts, conditional design
rules, adaptive length) and
`src/server/preferences/preference-extraction-openai.ts` (five-category alias
guidance). See `docs/CHAT_PROMPT_INTELLIGENCE.md`.

## Phase 8 introductions — cost governance

No new npm dependencies. Prisma `CostLog` + `src/server/ops/cost-guard.ts`
re-derived from legacy `CostLog` / `cost-tracker` / `cost-logger`. **CostLog is
the single spend authority** (session + per-user UTC day + global UTC day).
Caps: `CHAT_SESSION_COST_LIMIT_USD`, `CHAT_USER_DAILY_COST_LIMIT_USD` (alias
`CHAT_USER_DAILY_COST_USD`), `CHAT_GLOBAL_DAILY_COST_LIMIT_USD` (0 disables that
check). `chat-rate-limit.ts` enforces message counts only. `ChatGeneration.costUsd`
is telemetry — never used for caps. Concurrent turns can overshoot by at most one
call each (check-then-spend); `recordCostAndRecheck` logs `cost_soft_block` when
post-spend aggregates are over limit so subsequent turns refuse. Over-cap returns
`CHAT_FAILURE_COST_LIMIT`. See `docs/DATABASE.md` (CostLog).

## Phase 9 introductions — RAG

No new npm dependencies. Prisma `DesignDoc` + `src/server/rag/*` re-derived from
legacy `lib/eva/rag/*` and `config/design-docs/`. Retrieval is flag-gated
(`CHAT_RAG_ENABLED=0` default); embeddings use raw OpenAI fetch. In-process TTL
cache (60s, versioned by count+max createdAt) replaces legacy whole-table
module cache. See `docs/CHAT_RAG.md`.

## Phase 10 introductions — side features + policy

No new npm dependencies. `src/server/structured-output/generate-structured.ts`
powers suggestions, brainstorm, and recommendations (path avoids ESLint's
blocked `ai` package pattern). Routes under
`/api/account/conversations/[id]/{suggestions,brainstorm,recommendations}` are
gated by `CHAT_SIDE_FEATURES_ENABLED=0`. Policy gating
(`CHAT_POLICY_GATING_ENABLED=1`) short-circuits layout/shopping/furniture
advice when required facts are missing; dimensions live on
`StyleProfile.roomDimensions`. See `docs/CHAT_SIDE_FEATURES.md`.

## Phase 11 introductions — design workflow

No new npm dependencies. Conversation-scoped six-stage machine
(`WorkflowStage` + `WorkflowEvent`) re-derived from legacy
`lib/eva/design-workflow/*`. The legacy **playbook graph engine is intentionally
not ported**; useful config (required categories, prompt suffixes, response-length
hints) is static per-stage in `src/server/workflow/stages.ts`. Flag
`CHAT_WORKFLOW_ENABLED=0` default off. See `docs/CHAT_WORKFLOW.md`.

## Phase 12 introductions — attachment grounding

No new npm dependencies. Messages accept optional `attachmentUploadIds` (max 3);
ownership-checked private `Upload` rows are summarized via raw OpenAI vision
fetch (`CHAT_VISION_MODEL`) in `src/server/conversations/chat-attachment-grounding.ts`.
Flag `CHAT_ATTACHMENTS_ENABLED=0` default off. Cost kind `vision`. See
`docs/CHAT_ATTACHMENTS.md`.

## Phase 13+ introductions — memory, signals, calibration

No new npm dependencies. Schema adds `Conversation.contextSummary*` fields and
`ImplicitSignal` (migrations `add_conversation_summary`, `add_implicit_signal`).
Re-derived from legacy context-window summarization, project intelligence
prompts, implicit feedback, and calibration reporting — adapted to Account's
consent-based preference model.

| Part                 | Module(s)                                                                           | Flag(s)                                           |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| B — context summary  | `src/server/conversations/chat-context-summary.ts`                                  | `CHAT_SUMMARY_ENABLED=0`                          |
| C — project memory   | `src/server/projects/project-memory.ts`, `project-memory-prompt.ts`                 | `CHAT_PROJECT_MEMORY_ENABLED=0`                   |
| D — implicit signals | `src/server/preferences/implicit-signals.ts`                                        | `CHAT_IMPLICIT_SIGNALS_ENABLED=0`                 |
| E — calibration API  | `src/server/preferences/calibration.ts`, `GET /api/account/preferences/calibration` | _(always available to session)_                   |
| F — insights + share | `chat-insights.ts`, `chat-share.ts`, `SharedProject`                                | `CHAT_INSIGHTS_ENABLED=0`, `CHAT_SHARE_ENABLED=0` |

**Calibration design note:** this phase **replaces** legacy `CalibrationLog`
predicted-vs-outcome logging. Proposal accept/reject/undo already stores labeled
outcomes (`PreferenceProposal.confidence` + terminal `status` + `resolvedAt`);
the report aggregates those rows instead of writing a parallel log table.

**Part F product decisions:** share TTL default **7 days**; anonymous payload is
**title + messages** (not preference values). See `docs/CHAT_SHARE_AND_INSIGHTS.md`.

See `docs/CHAT_CONTEXT_SUMMARY.md`, `docs/PROJECT_MEMORY.md`, and
`docs/CHAT_PERSONAS_AND_PREFERENCES.md` (implicit signals section).

## Phase 14 introductions — Studio (image-only MVP)

No new npm dependencies. Prisma `FurnitureStudioPiece` (migration
`add_studio_pieces`) re-derived from legacy `FurnitureStudioPiece` and furniture
generate **image stage only**. The mesh/R3F viewer shipped later as Account
Canvas (Phase 15); this image-piece API stays a separate flag-off backend.

| Module                                              | Flag               |
| --------------------------------------------------- | ------------------ |
| `src/server/studio/*`, `/api/account/studio/pieces` | `STUDIO_ENABLED=0` |

See `docs/STUDIO.md`.

## Phase 15 introductions — Account Canvas playground

The classic Furnishes Studio playground (`furnishes-playground-standalone`)
is hosted at `/account/canvas`. This is a port, not an iframe and not an
import of `reference/`.

| Dependency / area                                        | Notes                                                  |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `@react-three/fiber`, `@react-three/drei`, `three@0.185` | 3D viewer in the Account stage                         |
| `zustand`                                                | Playground client store                                |
| Tailwind 4                                               | Scoped to `.furnishes-canvas-playground` only          |
| fal.ai via `fetch`                                       | Mesh generation; `@fal-ai/*` stays lint-blocked        |
| Anthropic via `fetch`                                    | Canvas chat dock; `@anthropic-ai/*` stays lint-blocked |

Flag: `CANVAS_PLAYGROUND_ENABLED` (default on; `0` restores the placeholder).
Source lives under `src/features/account/canvas/playground/` with `@studio/*`
path aliases. Playground HTTP stays on the paths the client already calls
(`/api/chat`, `/api/generate-asset`, `/api/generate-room`, `/api/studio/projects*`,
`/api/arrange`, `/api/explain`, `/api/suggestions`, `/api/conversations*`).
Playground AI + project routes require an Account session cookie
(`requirePlaygroundApiSession`); project snapshots and canvas chat threads
persist in PostgreSQL (`CanvasPlaygroundProject`,
`CanvasPlaygroundConversation*`). Do not merge Canvas chat into
`/account/chat`.

See `docs/STUDIO.md`.

## Intentional deviations from the frozen Landing design

- The approved menu includes “Product” as a work category. Because this
  repository has no Product surface, that item navigates to the general Work
  section and introduces no Product route or domain identifier.
- The approved design hides document scrollbars and uses damped wheel
  scrolling. Both are kept as approved behavior but scoped strictly to the
  Landing's mount (`LandingDocumentPaint`, `landing-damped-scroll.ts`);
  `globals.css` is a minimal neutral reset, so future surfaces get normal
  native scrolling and scrollbars.
- Accessibility exception carried from the approved source: the Landing's
  cinematic motion intentionally does not honor `prefers-reduced-motion`.
  Reassess before public a11y certification.

## Intentional deviations from the Account reference

Commerce views now ship with real services behind `COMMERCE_ENABLED=0`
(`docs/COMMERCE.md`). Two deliberate departures from the reference remain:

- **Billing lists no saved cards.** Card details never reach this app, so the
  reference's "•••• 4242" rows would imply a vault that does not exist. The GST
  registration number is omitted for the same reason rather than printed as a
  placeholder on something resembling an invoice.
- **The cart gained a quantity stepper** (`.wf-qty`). The reference showed a
  static "Qty 1", which a server-backed cart cannot honestly do.

Catalog imagery still uses the reference placeholder thumbnail, because `Upload`
is per-user and private and therefore unsuitable for public product images.

Image Generation is an Account workspace capability and is implemented
through a provider adapter with private generated-asset storage.

The reference Shortlist is replaced by a Product-free Inspiration Board
containing generated images, uploaded images, notes, and project links.

- Mobile uses a full-height navigation drawer instead of the reference’s
  clipped narrow desktop rail.
- Chat Stop aborts the browser fetch; the server persists a partial
  `stopped` assistant message. Upstream provider cancel is best-effort.
- Authenticator MFA remains deferred. Settings keeps the row from the approved
  design but marks it `aria-disabled` and explains on click, so it never reads as
  protection the account does not have. Password change, session revoke, and
  sign-in alerts are live.

## Scope additions accepted post-hoc

Share links (`CHAT_SHARE_ENABLED`), insights (`CHAT_INSIGHTS_ENABLED`), and the
studio image-piece backend (`STUDIO_ENABLED`, `src/server/studio`,
`FurnitureStudioPiece`) were retained flag-off after post-hoc review. They are
not part of the interior-design launch surface; enabling any of them requires
its own review. Account Canvas (`CANVAS_PLAYGROUND_ENABLED`) is a Phase 15
introduction and is on by default.

## Quiz → preference proposals

Design Quiz completions assemble `QuizResultV1` and POST
`/api/account/quiz-results`, which creates pending `PreferenceProposal` rows with
`source=quiz` (never auto-confirmed). Public quiz stashes the result in
`sessionStorage` for post-signup handoff. Avoid/exclusion language follows chat
extraction: drop matching positives; do not invent an exclusion category.

## Landing ↔ Account cohesion policy

The two surfaces should feel like one product without being forced into one
visual language. Concretely they share only:

- routes and navigation handoff (`src/lib/contracts/routes.ts`);
- the auth boundary (Landing links to `/login`; `/account` requires a
  session);
- brand naming (“Furnishes”) where needed.

They explicitly do **not** share fonts, heading treatments, tokens, or
components. Account loads Archivo + Space Mono for its own voice; Landing
keeps its own font wiring. If something proves genuinely identical after
both ship, promote it then — alignment by evidence, never by mandate.
