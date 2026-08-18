# Project memory

Project-scoped context for chat and recommendations when a conversation is linked
to a `Project`. Re-derived from legacy project intelligence prompts, adapted to
this repo's minimal schema (no product shortlist, no raw message excerpts).

## Flag

| Env                           | Default |
| ----------------------------- | ------- |
| `CHAT_PROJECT_MEMORY_ENABLED` | `0`     |

## Modules

| Path                                           | Role                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/server/projects/project-memory.ts`        | `buildProjectMemoryContext`, `assembleProjectMemoryContext`, `MEMORY_LIMITS` |
| `src/server/projects/project-memory-prompt.ts` | `formatProjectMemoryPrompt(ctx, "chat" \| "recommendations")`                |

## What is included

- Project name and summary (truncated)
- Recent `ProjectTimelineEvent.summary` rows (max 5)
- Confirmed user preferences (`getConfirmedPreferenceMap`)
- `StyleProfile.roomDimensions`
- Active **or saved** `DesignRecommendation` titles from project conversations (max 5)
- Sibling conversation `contextSummary` excerpts + `workflowStage` (max 3 with a non-null summary, 400 chars each)

## What is excluded

- Raw `Message.content`
- Upload filenames or image bytes
- Product SKUs / commerce data
- Sibling threads with no stored summary (skipped when filling the cap)

Returns `null` when the project is missing or the user is not owner/member.

## Wiring

When `CHAT_PROJECT_MEMORY_ENABLED=1` and `conversation.projectId` is set:

1. `resolveChatSendPromptExtras` → `buildProjectMemoryContext` + `formatProjectMemoryPrompt(ctx, "chat")`
2. Prompt slot **(4)** in `assembleChatSystemPrompt` (`projectMemoryBlock`)
3. Recommendations regenerate path uses kind `"recommendations"`

Flag-off omits the block (byte-identical to prompts without project memory).
