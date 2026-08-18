# Legacy chat / memory migration

Selective ETL from `furnishes_prod` into this app’s PostgreSQL schema. Dry-run
is the default. The new app never points at legacy tables at runtime.

## What is imported

| Source                             | Target                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Owned conversations                | `Conversation` (stable id)                                                                  |
| user/assistant messages            | `Message` (`status=complete`; assistant `assistantId` from conversation persona when valid) |
| Message feedback                   | `MessageFeedback` (one row per message; newest wins, `down` beats `up` on ties)             |
| Confirmed user preferences         | `UserPreference` (mapped to room/budget/style/color/furniture)                              |
| Confirmed conversation preferences | `UserPreference` only when unambiguous and not superseded by user-level memory              |
| Conversation persona               | `User.activeAssistantId` (newest unambiguous owned conversation)                            |

## What is skipped

- Guest conversations (`guestSessionId` / missing `userId`)
- Share / playbook / attachment / recommendation / CostLog rows
- Non-confirmed preferences
- All `PreferenceChange` rows (not reliable pending/rejected proposals)
- Users without email, or users not already present in the target DB

## Commands

```bash
# Fixture dry-run (CI / local, no legacy DB required)
pnpm migrate:legacy-chat:dry-run

# Live legacy Postgres dry-run
# LEGACY_DATABASE_URL=postgresql://… DATABASE_URL=postgresql://…
pnpm migrate:legacy-chat:dry-run

# Apply (refuses when unmatched users remain)
pnpm migrate:legacy-chat:apply -- --fixture path/to/snapshot.json

# Verify counts after apply
pnpm verify:legacy-chat-migration -- --fixture path/to/snapshot.json
```

Target users must already exist (matched by stable id or unique email). The
importer does not create accounts or invent password hashes.

## Category mapping

```text
room-related        → room
budget-related      → budget
style/aesthetic     → style
palette/color       → color
furniture/must-have → furniture
dealbreakers/unknown → conflict report (not imported)
```

When several confirmed values map to one category at the same timestamp with
different values, the plan records a `preference_category_conflict` and skips
that category.

## Reports

Dry-run prints source counts, planned counts, conflicts (orphaned projects,
invalid personas, preference mapping), and skip reasons.

Saved fixture dry-run (2026-08-04): `docs/legacy/migration-dryrun-2026-08-04.md`.
Re-run with `LEGACY_DATABASE_URL` set when a legacy Postgres copy is available
and replace/append that report with live counts.
