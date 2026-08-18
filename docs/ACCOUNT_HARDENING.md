# Account hardening (Phase 5)

Ops and security hardening for Auth + Account. Collaboration invitations and
MFA/passkeys stay deferred.

## Account deletion

`DELETE`-equivalent flow via `deleteAccount` in `src/server/account/privacy.ts`:

- Soft-deletes the `User` row (anonymized email, `deletedAt`, password wiped).
- Explicitly deletes all personal content (preferences, conversations/messages,
  room plans + items, projects, uploads, generations, inspiration, studio
  pieces, profiles, sessions, etc.). Soft-delete does **not** fire Prisma
  `onDelete: Cascade` on `userId`, so every personal table is wiped in code.
- **Retains `CostLog`** for the anonymized userId as a spend ledger (model,
  kind, tokens, cost only — no message or preference content).
- **Retains `Order` / `OrderItem`** for Singapore’s five-year transaction-record
  requirement. Shipping snapshot fields (`shipRecipient`, `shipLine1`,
  `shipPhone`, etc.) are overwritten to `"deleted"` / null so the order is not a
  live address book. `Address` and `Cart` are deleted (cart items cascade from
  cart). `SecurityEvent` is retained as an audit trail.

Regression: `src/server/account/privacy.integration.test.ts` seeds a row in
each personal table, deletes, and asserts wipe + CostLog retention.

## Rate limits

Sliding windows in `AuthRateLimit` (`src/server/auth/rate-limit.ts`):

| Surface             | Default   | Keys               |
| ------------------- | --------- | ------------------ |
| Login               | 10 / 15m  | IP + account email |
| Signup              | 10 / 15m  | IP + account email |
| Forgot password     | 5 / 15m   | IP + account email |
| Reset password      | 10 / 15m  | IP                 |
| Verify email        | 30 / 15m  | IP                 |
| Resend verification | 5 / 15m   | IP + user          |
| Demo sign-in        | 20 / 15m  | IP                 |
| Password change     | login max | user id            |

Override via `AUTH_*_MAX_ATTEMPTS` and `AUTH_RATE_LIMIT_WINDOW_MS` (see
`.env.example`).

## Sessions

- TTL: `AUTH_SESSION_TTL_DAYS` (default 14)
- `GET /api/account/settings/sessions` — active sessions for Settings
- `DELETE /api/account/settings/sessions/[sessionId]` — revoke other device
- Password change revokes other sessions

## Password change

`POST /api/account/settings/password` with `currentPassword`, `newPassword`,
`confirmPassword`. Records `password_changed` / `password_change_failure`.

## Audit + retention

`recordSecurityEvent` in `src/server/auth/security-events.ts` is the shared
writer (auth, demo, image generation, inspiration).

Purge aged rows:

```bash
pnpm auth:purge-retention
```

Defaults: security events 90 days; auth rate-limit windows 7 days;
`CostLog` / `ImplicitSignal` / `ChatGeneration` / `WorkflowEvent` 90 days;
also drops expired/revoked sessions and used/expired email tokens.
Env: `SECURITY_EVENT_RETENTION_DAYS`, `AUTH_RATE_LIMIT_RETENTION_DAYS`,
`COST_LOG_RETENTION_DAYS`, `IMPLICIT_SIGNAL_RETENTION_DAYS`,
`CHAT_GENERATION_RETENTION_DAYS`, `WORKFLOW_EVENT_RETENTION_DAYS`.

## Sign-in alerts

When `NotificationPrefs.emailSecurity` is true, successful login sends a
new-sign-in email through the existing SMTP/log adapter.

## Email verification gate

Verification tokens and mail always exist; `REQUIRE_EMAIL_VERIFICATION=1`
decides whether an unverified user may actually use the account. Default off.

When on, `requireCurrentSession` redirects unverified users to `/verify-email`
and `requireApiSession` answers `403 email_unverified`. Resend stays reachable
(`allowUnverified`) so nobody can be locked out of fixing their own state.

Turn it on only with SMTP that reliably delivers — with log-only mail, signup
reports success while the message goes nowhere, which is why preflight fails a
production boot without `SMTP_HOST`. Enabling it also revokes access for every
existing unverified account until each one verifies, so check that population
first.

## Explicitly deferred

- Authenticator / MFA / passkeys — Settings keeps the row from the approved
  design but marks it `aria-disabled` and says it is unavailable, rather than
  presenting a switch that looks like working protection
- Project invitations / multi-member collaboration
- Product shortlist / commerce APIs
