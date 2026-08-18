# Phase 2 Auth + Account — progress

## Architecture refactor (complete — no design/copy changes)

Tracking doc: `docs/ACCOUNT_ARCHITECTURE_REFACTOR.md`  
Visual baseline: `docs/account-architecture-baseline/`

Completed:

- Full inventory of routes, views, APIs, gaps
- Visual baseline screenshots frozen + capture/compare CI (`test:e2e:account:visual`)
- AccountShell renders route `{children}` (no longer discards them)
- React `AccountRail` with real Next.js `<Link>`s
- Route-owned pages for every `/account/*` surface (profile, chat, projects,
  uploads, image-gen, inspiration, help, commerce UI preserve)
- Style / Budget / Privacy / Settings / conversations / projects / uploads /
  image-gen / inspiration / help wired to real `/api/account/*` (commerce deferred)
- `studio-prototype/` deleted; `pnpm check:account-architecture` guards reintroduction
- Account CSS selectors scoped under `.furnishes-account`
- Fonts via `next/font/google`; titles via route metadata / `generateMetadata`
- Dashboard / Activity fed by `getAccountDashboard` / `listAccountActivity`
- Landing E2E green; visual regression ≤8% vs baseline
- Mobile: persistent rail at narrow widths (approved-design exception; no drawer)

## Implemented

- Auth: signup, login, logout, verify email, forgot/reset password, demo sign-in
- Sessions: HTTP-only cookie, digest-only storage, revoke current/other, expiry
- Rate limits + enumeration-resistant recovery copy
- Account shell (React rail + stage; persistent narrow-width rail)
- Routes: dashboard, activity, style, budget, privacy, conversations, chat,
  projects, project detail + inspector, uploads, settings, help,
  **image generation**, **inspiration board**, commerce UI preserve
- Persistence: Prisma PostgreSQL (budget allocations, generations, inspiration)
- Unit + Playwright coverage for shell/profile/conversations/projects/uploads/
  security/image-generation/inspiration
- Chat personas (four Eva lenses) + preference proposals / confirmed memory
  (`docs/CHAT_PERSONAS_AND_PREFERENCES.md`)

## Visual fidelity (reference-aligned, Product-free)

- Shell: chat rail swap, dynamic taglines, Workspace modes (Inspiration /
  Image Gen / Chat), wireview stage
- Chat, style, budget, privacy, projects, uploads as before
- Image Generation: composer, history, inspector, polling, cancel/retry
- Inspiration Board: Product-free grid replacing reference Shortlist

## Scope classification

Commerce **APIs / Prisma models** remain deferred. Routes for orders, billing,
cart, and checkout are preserved as static React UI (fixture copy only).

Product shortlist commerce metadata stays out of scope — Inspiration Board
is the Product-free replacement for `/account/shortlist` and `/account/inspiration`.

Image Generation is an Account workspace capability and is implemented
through a provider adapter with private generated-asset storage.

The reference Shortlist is replaced by a Product-free Inspiration Board
containing generated images, uploaded images, notes, and project links.

## Deferred (honest)

- Malware scanning for uploads
- MFA / passkeys
- Chat-to-image launch shortcuts
- Live SMTP/S3/image vendor credentials in CI (adapters are wired; secrets are ops)

## Commands

- `pnpm check`
- `pnpm test:e2e`
- `pnpm test:e2e:account:core`
- `pnpm test:e2e:account:chat-memory`
- `pnpm test:e2e:account:creative`
- `pnpm test:e2e:account:visual`
- `pnpm test:e2e:landing`
- `pnpm check:account-architecture`
