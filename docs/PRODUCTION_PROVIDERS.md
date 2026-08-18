# Production providers and storage (Phase 3)

Adapters for outbound email, private object storage, HTTP image generation,
and waitlist persistence. Live vendor credentials stay optional — local
defaults remain safe for development and CI.

## Waitlist

`POST /api/waitlist` persists `WaitlistSignup` rows (unique email). Landing
`submitWaitlist` calls this API. Deterministic local-part shortcuts
(`duplicate`, `unavailable`, and `+` tags) stay for Playwright / unit tests.

Rate limit: 10 requests / hour / IP via `AuthRateLimit`.

## Email

| Mode   | When              | Behavior                                         |
| ------ | ----------------- | ------------------------------------------------ |
| `log`  | `SMTP_HOST` unset | Logs subject/to/text; auth flows succeed locally |
| `smtp` | `SMTP_HOST` set   | nodemailer send using `EMAIL_FROM` / `SMTP_*`    |

## Private storage

| Provider          | Env                                 | Notes                                                    |
| ----------------- | ----------------------------------- | -------------------------------------------------------- |
| `local` (default) | `STORAGE_PROVIDER=local`            | `.data/uploads`                                          |
| `s3`              | `STORAGE_PROVIDER=s3` + bucket/keys | S3 or S3-compatible (R2/MinIO via `STORAGE_S3_ENDPOINT`) |

Malware scanning is still deferred.

## Image generation HTTP

Already implemented (`IMAGE_GENERATION_PROVIDER=http`). Requires URL, key, and
model. Unit-tested with mocked fetch. Live vendor SLA remains an ops concern.

## Rollback

Unset `SMTP_HOST` and/or set `STORAGE_PROVIDER=local` and
`IMAGE_GENERATION_PROVIDER=disabled|test` then restart.
