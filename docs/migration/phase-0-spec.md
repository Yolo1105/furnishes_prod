> **Historical migration doc:** Phase 0 integration spec (2026). For **current database and runtime expectations**, see [`docs/CURRENT_RUNTIME_TRUTH.md`](../CURRENT_RUNTIME_TRUTH.md). Older references to optional SQLite dev are **historical**, not the default today.

# Phase 0 — Migration spec (Eva / AI Assistant → furnishes_prod)

**Status:** In progress — layout locked; remaining sign-offs in §4–§6  
**Date:** 2026-04-09 (updated: layout + auth strategy)  
**Goal:** Single Next.js app; Inspiration → `/chatbot` becomes the full reference product (UI + server), integrated without breaking the marketing site.

---

## 1. Integration model (locked)

| Decision             | Choice                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| Deployment           | **Single Next.js app** in `furnishes_prod` (same build/deploy as the site). |
| Alternative rejected | Separate microservice or iframe-only embed for v1 — not the default path.   |

---

## 2. Folder and import conventions (locked)

| Decision                | Choice                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App Router root         | Keep **`app/`** at repository root. **Do not introduce `src/`** for this merge unless a future refactor standardizes the whole repo.                                                                                                                                                                              |
| Path alias              | **`@/*` → `./*`** (existing `tsconfig.json`). New Eva modules live under predictable roots (see below).                                                                                                                                                                                                           |
| Code placement (target) | **Server + domain engine:** `lib/eva/` or `lib/chatbot/` (pick one name in Phase 1 — **recommend `lib/eva/`** to avoid clashing with generic `lib/utils.ts`). **App routes:** `app/api/...` next to existing routes. **UI:** `app/(segment)/chatbot/` or colocated `components/eva/` — finalize in Phase 1 spike. |
| Existing split          | Repo already has **`lib/`** (quiz, utils) and **`app/lib/`** (env, parsers). Eva-specific code should stay **out of `app/lib/`** unless it is truly app-shell-only; prefer **`lib/eva/`** for portable server logic.                                                                                              |

---

## 3. URL and route group (**locked**)

| Decision       | **A — Chromeless** — `app/(chromeless)/chatbot/` → public URL **`/chatbot`**. No marketing Header, UtilityBar, main margin, or Footer. Wrapped only by `app/(chromeless)/layout.tsx` (`<main>` full viewport). |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rationale      | Long-term: full assistant workspace (reference **DashboardLayout**) needs **height and a single shell**. Avoids double chrome when Eva ships its own nav/sidebars.                                             |
| Implementation | **`(site)/chatbot` removed**; route lives under **`(chromeless)/chatbot`**. Placeholder unchanged until Eva UI lands.                                                                                          |

**Rejected for this product:** **B — Site chrome** (`(site)/chatbot`) — kept only if assistant must stay a narrow marketing sub-page (not aligned with Eva parity).

---

## 4. v1 scope — Milestones A vs B

### Milestone A — Must ship (vertical slice)

Minimum “real product” loop:

- Create/load **conversation** and **messages** (persisted).
- **Streaming** assistant reply (`/api/chat` equivalent).
- **Parallel extraction** (`/api/extract` equivalent) → **preferences** + change history.
- **Right sidebar** (or equivalent) showing structured prefs; manual edit if in reference.
- **Reload** restores conversation + prefs.
- **History / recents** if required by reference shell (can be minimal list).

### Milestone B — Parity extras (after A is stable)

Order roughly by dependency / value:

1. File **uploads** + listing (after storage decision in §6).
2. **Insights** / **recommendations** surfaces.
3. **Export** (Markdown/JSON) + **share link** + **`/shared/[shareId]`** public page.
4. **Playbook**, **admin stats**, **feedback** — only if product requires them for launch.

**Sign-off:**

- [ ] Milestone A scope approved as above
- [ ] Milestone B: list **must-have** items for first production release: **\*\***\_\_\_**\*\***

---

## 5. Identity and auth (**locked strategy — long-term default**)

| Layer            | Choice                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data model**   | **`userId` nullable** on `Conversation` (and related rows) from the first migration — conversations can be anonymous or owned. No schema that blocks attaching an account later.                                                                                 |
| **UX / rollout** | **Anonymous-first UX** is OK until persistence exists: users can chat without signing in.                                                                                                                                                                        |
| **Auth system**  | **NextAuth** (or equivalent) aligned with the **Eva reference**, wired **as soon as Prisma + `User` exist** — target **early Milestone A** after first successful DB slice, not an indefinite defer to Milestone B. Optional: Google + credentials when enabled. |
| **Why**          | Long-term: multi-device history, ownership, share links, and abuse controls need real accounts. This hybrid avoids blocking the first vertical slice while **not** painting the team into a cookie-only corner.                                                  |

Repo note: **`app/(site)/login`** exists; wiring it to NextAuth comes with the auth milestone above.

**Rule:** All **permission checks** stay **server-side**; client only reflects session state.

---

## 6. Uploads and storage (gate before Milestone B uploads)

| Environment    | Proposal                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local dev**  | Filesystem under something like `uploads/` or `tmp/` + DB metadata (matches many reference patterns).                                                                               |
| **Production** | **Not** local disk on multi-instance hosts without shared FS. Choose **object storage** (e.g. S3, R2, Vercel Blob) + signed URLs or gated **`/api/uploads/[id]`** with auth checks. |

**Sign-off:**

- [ ] Prod storage direction: **\*\***\_\_\_**\*\*** (decide before implementing upload routes)
- [ ] Public vs private files default: **\*\***\_\_\_**\*\***

---

## 7. Environment variables (inventory)

Extend **`app/lib/env.ts`** with Zod validation as keys are added. **Never** expose secrets via `NEXT_PUBLIC_*`.

| Variable               | Server   | Purpose                                                                  | Milestone          |
| ---------------------- | -------- | ------------------------------------------------------------------------ | ------------------ |
| `OPENAI_API_KEY`       | Yes      | LLM chat + extraction                                                    | A                  |
| `DATABASE_URL`         | Yes      | Prisma (**PostgreSQL** today; SQLite only in archived/historical setups) | A                  |
| `NEXTAUTH_SECRET`      | Yes      | Auth if used                                                             | B if auth deferred |
| `NEXTAUTH_URL`         | Yes      | Auth callbacks                                                           | B if auth deferred |
| Google OAuth ids       | Yes      | Optional OAuth                                                           | Optional           |
| Upload path / bucket   | Yes      | File storage                                                             | B                  |
| `SENTRY_*` / analytics | Optional | Ops                                                                      | Optional           |

Add any host-specific vars (e.g. Vercel, connection pooling) when deploy target is fixed.

---

## 8. Risk register (from review — tracked, not blocking Phase 0)

- **Dependency merge:** spike branch before mass port (Phase 1).
- **Chat + extract:** integration tests / manual script for **parallel** behavior.
- **Streaming + serverless timeouts:** validate on target host early.
- **Mock vs real:** audit views after UI port (Phase 8 in master plan).
- **Rollback:** first prod migration + optional feature flag for `/chatbot`.

---

## 9. Exit criteria for Phase 0

Phase 0 is **complete** when:

1. This document is **reviewed**.
2. ~~**§3** (route group / chrome)~~ — **done** (chromeless).
3. **§4** (Milestone A/B) is **signed** (product).
4. ~~**§5** (auth strategy)~~ — **documented** (nullable `userId` + NextAuth after DB).
5. **§6** has at least a **production storage direction** before upload work.
6. **§7** is acknowledged; exact values filled when keys exist.

---

## 10. Sign-off

| Role            | Name | Date |
| --------------- | ---- | ---- |
| Product / owner |      |      |
| Engineering     |      |      |

**Notes / exceptions:**

---
