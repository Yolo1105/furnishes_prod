# Image Generation

Status labels: **Implemented with local adapter** · **Test-only** provider · **Provider configuration required** for production HTTP.

## Routes

- `/account/image-generation`
- APIs under `/api/account/image-generations`

## Providers

| Value      | Status                          | Notes                                               |
| ---------- | ------------------------------- | --------------------------------------------------- |
| `disabled` | Implemented                     | Explicit unavailable error; no fake images          |
| `test`     | Test-only                       | Allowed when `NEXT_PUBLIC_E2E=1` or `NODE_ENV=test` |
| `http`     | Provider configuration required | Generic adapter; needs URL, key, model              |

Prompt triggers for the test provider: `test-ready`, `test-delayed`, `test-fail`, `test-cancel`.

## Storage

Ready outputs are stored as private `Upload` rows with `source=generated_image` under `.data/uploads`. Downloads always go through owner-checked API routes.

Local storage is **development / single-instance only**. For horizontally
scaled deployment set `STORAGE_PROVIDER=s3` (see `docs/PRODUCTION_PROVIDERS.md`
and `docs/DEPLOYMENT.md`).

## Limits

Configured via env: daily per user, concurrent active generations, allowed sizes, request timeout.

## Deletion

Deleting a generation removes its generated upload, storage object, and inspiration rows that reference that generation.

## Deferred

- Paid production image vendor credentials
- Distributed job queue / multi-region storage
- Chat-to-image launch shortcuts (optional; not required for route completion)
