# Legacy chat migration dry-run — 2026-08-04

## Source

- **Mode:** fixture dry-run (default `src/server/migration/fixtures/legacy-chat-fixture.json`)
- **Live legacy Postgres:** not run — `LEGACY_DATABASE_URL` is unset in this environment
- **Command:** `pnpm migrate:legacy-chat:dry-run`
- **Target DB:** local `DATABASE_URL` (used only for live loads; fixture path does not query target users beyond plan matching rules encoded in the fixture)

To re-run against a legacy copy:

```bash
# LEGACY_DATABASE_URL=postgresql://… DATABASE_URL=postgresql://…
pnpm migrate:legacy-chat:dry-run
```

Save a fresh report as `docs/legacy/migration-dryrun-<date>.md` when live data is available.

## Fixture report summary

### Source counts

| Entity                  | Count |
| ----------------------- | ----: |
| users                   |     2 |
| conversations           |     3 |
| messages                |     4 |
| feedback                |     3 |
| userPreferences         |     4 |
| conversationPreferences |     2 |
| preferenceChanges       |     1 |

### Planned counts

| Entity          | Count |
| --------------- | ----: |
| users (matched) |     1 |
| conversations   |     2 |
| messages        |     2 |
| feedback        |     1 |
| preferences     |     2 |
| skips           |     8 |
| conflicts       |     3 |

### Conflicts (3)

| Code                           | Detail                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `orphaned_project_link`        | conversation `conv-owned`: Project `project-missing` is not in the target database; clearing link |
| `invalid_persona_id`           | conversation `conv-bad-persona`: Unknown persona `eva-unknown`                                    |
| `preference_category_conflict` | user `target-user-1`: Ambiguous confirmed values for category `room`; manual review required      |

### Skips (8) by reason

| Reason                            | Count |
| --------------------------------- | ----: |
| `conversation_preference_unowned` |     1 |
| `feedback_message_skipped`        |     1 |
| `guest_or_unowned_conversation`   |     1 |
| `message_conversation_skipped`    |     1 |
| `message_role_unsupported`        |     1 |
| `preference_change_not_imported`  |     1 |
| `preference_not_confirmed`        |     1 |
| `user_missing_email`              |     1 |

## Account-matching decision (open for developer)

Per migration rules and `docs/LEGACY_CHAT_MIGRATION.md`:

- Importer **only fills users that already exist** in the target DB (match by stable id or unique email).
- Importer **never creates accounts** or invents password hashes.
- Users without email, or emails not present in target → `user_unmatched` / skipped (`user_missing_email` in fixture).

**Ask before changing this:** bulk account creation from legacy is out of scope unless explicitly approved.

## Not imported (by design)

Share / playbook / attachment / recommendation / CostLog rows; non-confirmed preferences; all `PreferenceChange` rows; guest conversations.

Historical `DesignRecommendation` import is a separate follow-up (ask before extending ETL).

## Apply readiness

- **Do not run** `pnpm migrate:legacy-chat:apply` until:
  1. A live dry-run against a legacy Postgres copy is saved and reviewed
  2. Unmatched users are resolved (or accepted as permanent skips)
  3. `pnpm db:backup` has been taken
- After apply: `pnpm verify:legacy-chat-migration` and append counts here
