# Chat personas and confirmed preference memory

Status labels used below: **Implemented** · **Local fallback** · **External provider configuration required** · **Deferred** · **Removed from scope**

## Personas

| Item                                                                              | Status      |
| --------------------------------------------------------------------------------- | ----------- |
| Four server-owned personas (`eva-general`, `eva-style`, `eva-plan`, `eva-budget`) | Implemented |
| Account-level `User.activeAssistantId`                                            | Implemented |
| Persona picker in Eva side panel                                                  | Implemented |
| Non-retroactive historical messages                                               | Implemented |
| `Message.assistantId` provenance on assistant replies                             | Implemented |
| Persona prompt overlay (no Product / playbook voice)                              | Implemented |

Catalog: `src/lib/eva/personas/`. Active persona is mutated only via `PATCH /api/account/assistant-persona` against the catalog — never via client-supplied prompt text.

## Preference memory

| Item                                              | Status             |
| ------------------------------------------------- | ------------------ |
| Categories: room, budget, style, color, furniture | Implemented        |
| `inferred != remembered` (pending proposals only) | Implemented        |
| Accept / edit-accept / reject / undo              | Implemented        |
| Manual chip set/remove                            | Implemented        |
| Source inspector (owner-scoped)                   | Implemented        |
| `User.memoryEnabled` gating                       | Implemented        |
| Auto-confirm high-confidence extracts             | Removed from scope |
| Quiz ingest → pending proposals (`source=quiz`)   | Implemented        |

Models: `UserPreference`, `PreferenceProposal` (migration `add_chat_personas_and_preference_proposals`; quiz provenance `quiz_proposal_provenance`).

## Quiz ingestion

| Item                                                                   | Status      |
| ---------------------------------------------------------------------- | ----------- |
| `QuizResultV1` contract + Zod (`src/lib/contracts/quiz-result.ts`)     | Implemented |
| `POST /api/account/quiz-results` (5/day/user, memory-gated)            | Implemented |
| Map style/color/room/budget/furniture → pending proposals              | Implemented |
| Palette avoid → drop matching color candidates (no exclusion category) | Implemented |
| Dedupe vs pending + confirmed                                          | Implemented |
| Public `/quiz` → `sessionStorage` → post-login handoff (7-day max age) | Implemented |
| Proposal UI tag “From your quiz”                                       | Implemented |

Mapper: `src/server/preferences/quiz-ingest.ts`. Client assembly: `src/features/quiz/assemble-quiz-result.ts`.
Quiz completions never auto-confirm memory — users accept proposals like chat extracts.

## Message sources

| Source             | Extraction         |
| ------------------ | ------------------ |
| `typed`            | Full extract       |
| `room_starter`     | Room category only |
| `quick_suggestion` | Skip               |
| `brainstorm`       | Skip               |

## Providers

| Env                              | Values                                      | Status                                                    |
| -------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| `CHAT_PROVIDER`                  | `local` (default), `openai`                 | Local fallback / External provider configuration required |
| `PREFERENCE_EXTRACTION_PROVIDER` | `heuristic` (default), `openai`, `disabled` | Implemented                                               |

OpenAI adapters use server-only `fetch` (no SDK package). Production fails env validation when `openai` is selected without keys/models. Default CI and local runs use `local` + `heuristic` and do not require credentials.

See `.env.example` for timeouts and proposal limits.

## Implicit signals

| Item                                                 | Status                      |
| ---------------------------------------------------- | --------------------------- |
| Detect restate of confirmed preference               | Implemented (module)        |
| Detect restate of pending proposal                   | Implemented (module)        |
| Detect removal language                              | Implemented (module)        |
| Style change shortly after recommendation            | Implemented (module)        |
| Persist `ImplicitSignal` rows (type + category only) | Implemented (module)        |
| Pipeline wiring after user send                      | Implemented (send + stream) |

Module: `src/server/preferences/implicit-signals.ts`. Flag: `CHAT_IMPLICIT_SIGNALS_ENABLED=0`.
Calibration report includes `restate_pending_proposal` counts per category as a trust column (`GET /api/account/preferences/calibration`).

## APIs

- `GET`/`PATCH` `/api/account/assistant-persona`
- `GET` `/api/account/preferences`
- `GET` `/api/account/preferences/calibration`
- `PATCH`/`DELETE` `/api/account/preferences/[category]`
- `GET` `/api/account/preference-proposals`
- `POST` `.../accept` · `.../reject` · `.../undo` · `GET .../source`
- `POST` `/api/account/conversations/[id]/messages` accepts `messageSource`
- `POST` `/api/account/quiz-results` — ingest Design Quiz → pending proposals

## Excluded legacy Eva systems

Removed from scope for this phase: playbooks, Product recommendations, guest sessions, assistant marketplace, temporary chats, attachment/mic workflows, old three-panel dashboard.

Insights and share links shipped later behind `CHAT_INSIGHTS_ENABLED` /
`CHAT_SHARE_ENABLED` — see `docs/CHAT_SHARE_AND_INSIGHTS.md`.
