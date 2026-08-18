# Chat design workflow

Six-stage journey on each conversation, driving prompt overlays and optional
policy category gates.

## Decision: no playbook graph

The legacy playbook graph engine (`LEGACY/lib/eva/design-workflow` project-scoped
graph + `workflowSatisfied` JSON) is **not ported**. Stage config is static
(`requiredCategories`, `assistantGuidance`, `promptSuffix`, `responseLength`).
Advances are evaluated from confirmed preferences + message heuristics and
audited as `WorkflowEvent` rows.

## Flag

| Flag                    | Default | Effect                                                                                                              |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `CHAT_WORKFLOW_ENABLED` | `0`     | When off: no stage transitions, no prompt overlays; `workflowStage` still defaults to `intake` on new conversations |

## Stages

`intake` → `preference_capture` → `clarification` (optional) →
`recommendation_generation` → `refinement` → `decision_handoff`

## Wiring

- `maybeAdvance` runs after claiming the user message (send + stream).
- Stage `assistantGuidance` + `promptSuffix` merge into `buildChatSystemPrompt`.
- Stage `responseLength` overrides Task 1.2 auto length when set.
- Stage `requiredCategories` feed Phase 4 `checkPolicy` when non-empty.
- Conversation GET exposes `workflowStage` for UI progress.
