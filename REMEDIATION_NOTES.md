# Remediation notes — `furnishes_prod`

Baseline and phase-by-phase changes for the production-readiness remediation plan.

---

## Phase 0 Baseline

**Date:** 2026-04-09

### Toolchain

| Check              | Result                                          |
| ------------------ | ----------------------------------------------- |
| `npm install`      | Success. 0 vulnerabilities.                     |
| `npx tsc --noEmit` | **Pass** — no TypeScript errors.                |
| `npm run lint`     | **Pass** — ESLint exited 0, no issues reported. |
| `npm run build`    | **Pass** (Next.js 16.2.2, default Turbopack).   |

### `lucide-react`

- **`npm ls lucide-react`:** `lucide-react@1.8.0`
- **Imports in repo:** `app/components/sliding-nav-icons.tsx` — `Heart`, `Search`, `ShoppingCart`, `User`.

npm registry `lucide-react` latest stable is **1.8.0** (the `0.5xx` line is an older release line; **1.8.0** is current). The project was already on the latest.

### First Load JS (Phase 0)

Next.js **16.2.2** `next build` (Turbopack and `next build --webpack`) prints a **route table without per-route First Load JS (kB)** in the terminal. Baseline comparison by route bundle size will use the same `npm run build` in later phases; if the CLI still omits sizes, note “N/A” and compare using build success + manual checks until a bundle analyzer is added.

| Route          | First Load JS (kB)                   |
| -------------- | ------------------------------------ |
| `/`            | N/A (not printed by Next 16.2.2 CLI) |
| `/collections` | N/A                                  |
| `/about`       | N/A                                  |
| `/inspiration` | N/A                                  |
| `/quiz`        | N/A                                  |

**Routes confirmed in build output:** `/`, `/about`, `/budget`, `/chatbot`, `/collections`, `/collections/[id]` (dynamic), `/inspiration`, `/login`, `/playground`, `/quiz`, `/room-planner`, `/style`, `/_not-found`.

### Warnings / peer deps

- `npm install`: “145 packages are looking for funding” (informational only).

---

## Phase 1 Complete

**Date:** 2026-04-09

### Changes

| Item                           | Detail                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1** `next.config.ts`       | `images.minimumCacheTTL` set from `0` to `3600` (comment added).                                                                                                      |
| **1.2** `tsconfig.json`        | `"target": "ES2017"` → `"ES2022"`.                                                                                                                                    |
| **1.3** `package.json`         | Added `"typecheck": "tsc --noEmit"`. `lint` → `eslint --max-warnings=0`.                                                                                              |
| **1.4** `lucide-react`         | Pinned to **`1.8.0`** (exact). npm latest is 1.8.0; imports unchanged in `sliding-nav-icons.tsx`.                                                                     |
| **1.5** `CollectionFilter.tsx` | UTF-8 BOM removed (must start with `"` = `22 75 73`, no `ef bb bf`). Re-checked in review follow-up; **`.editorconfig`** sets `charset = utf-8` to reduce recurrence. |
| **1.6** Boundaries             | Added `app/error.tsx` (client), `app/loading.tsx`, `app/not-found.tsx`.                                                                                               |

### Verification

- `npm run typecheck` — pass
- `npm run lint` — pass (no Phase 1 lint backlog)
- `npm run build` — pass

### First Load JS (Phase 1 vs Phase 0)

Still **N/A** — Next 16.2.2 CLI does not print per-route First Load kB.

### Phase 1 Lint Backlog

None — `eslint --max-warnings=0` passes.

---

## Phase 2 Complete

**Date:** 2026-04-09

### Line counts (Phase 2 only — before Phase 3 split)

| File                                                   | Before |              After Phase 2 |
| ------------------------------------------------------ | -----: | -------------------------: |
| `app/collections/[id]/page.tsx` (pre–route-group path) |    459 | **339** (target under 350) |

After **Phase 3**, the product route is split: `app/(site)/collections/[id]/page.tsx` is a short async server file; UI lives in `ProductDetailView.tsx`.

### New files

- `app/(site)/collections/[id]/ProductDetailAccordion.tsx` — shared accordion (under 40 lines).
- `app/(site)/collections/[id]/ProductTrustSignals.tsx` — trust row SVGs (client, imported by PDP).

### Changes

- Six duplicate accordions replaced with `ProductDetailAccordion` + `accordionSections` array.
- Star SVG path deduped: single `STAR_PATH_D` constant in **`ProductDetailView.tsx`** (one path string in that file).
- Thumbnails and color swatches use `<button type="button">`; `role="button"` / `tabIndex={0}` removed.
- `:focus-visible` outline on `.thumbnail` and `.detailSwatch` in `ProductDetailPage.module.css`; button reset styles added.
- `setTimeout` for cart success moved to `useEffect` with cleanup (no timer in click handler).
- Initial state uses `product.colors[0]?.value ?? ""` and `product.sizes[0] ?? ""`; color label uses `?? product.colors[0]?.name ?? ""` (no `"Charcoal"` fallback in the page).
- `getCollectionProductDetails` validates non-empty `colors` and `sizes` and throws a clear error if not.
- Thumbnail strip background: `#ffffff` → `var(--color-surface)` (token).

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build` — pass.

---

## Phase 3 Complete

**Date:** 2026-04-09

### Route groups

- `app/(site)/layout.tsx` — server layout: `SiteChrome`, `UtilityBar`, `Header`, `MainWithSidebarMargin`, `Footer` (same tree as former `SiteRouteShell` non-chromeless branch).
- `app/(chromeless)/layout.tsx` — server layout: minimal `<main id="main">` (same as former chromeless branch).
- Root `app/layout.tsx` — only `RightNavProvider` + `{children}` (no shell).

### Moves

Routes live under `app/(site)/` (home, about, budget, collections, inspiration, login, playground, quiz, room-planner), `app/(chromeless)/style/`, and **`app/(chromeless)/chatbot/`** → public URL **`/chatbot`**. URL paths are unchanged (`/`, `/style`, `/chatbot`, etc.).

### Removed

- `app/components/site-route-shell.tsx` (deleted).

### Style explorer shared assets (path fix)

Layouts for `/style`, `/quiz`, and `/budget` shared fonts/CSS via `@/app/style/`, which no longer exists after the move. Shared files now:

- `lib/style-explorer-font.ts` — `styleExplorerMono` (Space Mono).
- `app/style-explorer.css` — keyframes and `.style-explorer-root` rules.

Those three route layouts import the font/CSS **via** `app/components/StyleExplorerRouteShell.tsx` (shared wrapper; each layout still exports its own `metadata`).

### Product detail route

- `app/(site)/collections/[id]/page.tsx` — **async server component**: `await params`, `notFound()` on missing product, renders `<ProductDetailView product={...} />`.
- `app/(site)/collections/[id]/ProductDetailView.tsx` — **client** island with prior PDP UI/state.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build` — pass (after deleting stale `.next` so route types regenerate).

### First Load JS

Still **N/A** in Next 16.2.2 CLI output; compare in a later phase with bundle analyzer if needed.

### Pages without `page.tsx` `"use client"` (examples)

Home, about, collections listing, and product detail **server** `page.tsx` files; inspiration (and quiz/budget apps) remain client-heavy at page or child level as before.

---

## Follow-up hygiene (post-audit)

- **`globals.css`:** `--color-on-accent-fg` for CTA / selected-chip text on `--color-accent` (replaces raw `white` in PDP CSS).
- **`StyleExplorerRouteShell`:** deduplicates `/style`, `/quiz`, `/budget` layout wrappers.

---

## Phase 4 Complete

**Date:** 2026-04-09

### Goal

Refactor `CollectionFilter.tsx`: URL as single source of truth, extract subcomponents, remove inline `<style>` keyframes, reduce inline styles.

### New / moved files

| File                                                       | Role                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `app/hooks/useCollectionUrlState.ts`                       | `state` from `parseCollectionSearchParams(searchParams)`; `updateUrl(next)` → `router.replace`. |
| `app/lib/parsePriceRange.ts`                               | Price quick-filter string parsing (moved out of the filter component).                          |
| `app/lib/parsePriceRange.test.ts`                          | Vitest cases for `parsePriceRange` (see Phase 7).                                               |
| `app/components/CollectionProductCard.tsx` + `.module.css` | Product cards + `useReveal`; tokens for shadows/text.                                           |
| `app/components/CollectionFilterDropdown.tsx`              | Fixed dropdown panel (sort + quick filters); real `<button>`s where appropriate.                |
| `app/components/CollectionListingProductGrid.tsx`          | Editorial vs grid product layouts.                                                              |

### Line counts

| File                           |         Approx. lines |
| ------------------------------ | --------------------: |
| `CollectionFilter.tsx`         | **~313** (was ~1,065) |
| `CollectionFilterDropdown.tsx` |                  ~244 |

### Behavior

- No mirrored `useState` for `quickActive` / `sort`; only **search draft** + debounced `updateUrl` for `q`, plus one effect syncing draft from `state.q` when the URL `q` changes (back/forward, clear). **ESLint:** `react-hooks/set-state-in-effect` disabled on that line with a comment (see file).
- No `JSON.stringify` deep-compare; no ping-pong `useEffect` writing the URL from derived state.
- Keyframes **`listing-filter-drop-in`** / **`listing-filter-fade-up`** live in `app/globals.css` so staggered `animation` strings work with CSS Modules.
- Extended `CollectionFilter.module.css` (dropdown, listing layout); removed injected `<style>` block from JSX.
- Replaced raw `#fff` in quick-filter count + collection CTA hover with `var(--color-on-accent-fg)` where applicable.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build` — pass.

---

## Phase 5 — Quiz module

**Done:**

- **`components/quiz/question-layouts.tsx`** is a thin re-export of **`components/quiz/layouts/`** (one file per layout + `types.ts`, `shared.tsx`, `index.ts`). Layouts that delegate to another layout import the sibling module (e.g. `LayoutSliders`, `LayoutLifeReality`). **`layout-openings.tsx`** defines local **`OPENING_TYPES`** / **`WALLS`** (same as pre-split).
- **`lib/quiz-data.ts`** re-exports **`lib/quiz-data/index.ts`**, which splits data into **`types`**, **`style-questions`**, **`budget-questions`**, **`room-questions`**, **`all-questions`**, **`style-profiles`**, **`compute-budget-range`**, **`calculate-result`**.
- **`/quiz`** introduced a client wrapper that **`next/dynamic`**-loaded **`QuizApp`** with **`ssr: false`** and a loading placeholder (the file was later renamed **`quiz-app-loader.tsx`** / **`QuizAppLoader`** in Phase 6).

**Verification:** `npm run typecheck`, `npm run lint`, `npm run build`.

---

## Phase 6 Complete

**Date:** 2026-04-09

### Goal

One lazy-loading wrapper for every quiz entry route; rename for clarity.

### Changes

| Route     | Before Phase 6     | After                               |
| --------- | ------------------ | ----------------------------------- |
| `/quiz`   | `DesignQuizLoader` | **`QuizAppLoader`** `mode="style"`  |
| `/budget` | Direct `QuizApp`   | **`QuizAppLoader`** `mode="budget"` |
| `/style`  | Direct `QuizApp`   | **`QuizAppLoader`** `mode="full"`   |

- **`design-quiz-loader.tsx`** replaced by **`components/quiz/quiz-app-loader.tsx`** exporting **`QuizAppLoader`**.

### Verification

- `npm run typecheck`, `npm run lint`, `npm run build` — pass.

---

## Phase 7 Complete

**Date:** 2026-04-09

### Goal

Add **Vitest** and unit tests for **`parsePriceRange`**.

### Changes

- **`vitest`** dev dependency; **`vitest.config.ts`** (`node` environment, `@` alias, excludes `.next`).
- **`package.json` scripts:** `test` → `vitest run`, `test:watch` → `vitest`.
- **`app/lib/parsePriceRange.test.ts`** — cases for `All`, `Under $…`, `$…+`, hyphen / en-dash / `to` ranges, optional `$` on upper bound, and non-matching strings.

### Verification

- `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build` — pass.

---

## Phase 8 Complete

**Date:** 2026-04-09

### Goal

Add **GitHub Actions CI** so the same checks as local development run on **`push`** and **`pull_request`** to **`main`**.

### Changes

- **`.github/workflows/ci.yml`** — job **`verify`** introduced here; **Phase 9** added **`format:check`**. Current order: `npm ci` → `typecheck` → `format:check` → `lint` → `test` → `build` (**ubuntu-latest**, **Node 20**, npm cache, concurrency cancel — see file).

### Verification

- Workflow file validates with GitHub once pushed; locally: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — pass. (Phase 9 adds **`format:check`** to CI.)

---

## Phase 9 Complete

**Date:** 2026-04-09

### Goal

**Prettier in CI**, **webpack bundle analysis** for local bundle inspection, and **branch protection** guidance.

### Changes

- **CI:** **`.github/workflows/ci.yml`** — **`npm run format:check`** after typecheck, before lint.
- **Bundle analyzer:** **`@next/bundle-analyzer`** + **`cross-env`**; **`next.config.ts`** wraps config with analyzer when **`ANALYZE=true`**. Default **`next build`** stays **Turbopack**; **`npm run analyze`** runs **`next build --webpack`** so reports are generated (HTML under **`.next/analyze/`**). Next 16 does not emit webpack reports for Turbopack-only builds.
- **Formatting:** Ran **`npm run format`** once so **`format:check`** passes repo-wide.

### Branch protection (manual, GitHub UI)

On the repo: **Settings → Branches → Branch protection rule** for **`main`**: require the **CI** workflow (or status checks you rely on) before merge; optionally require PR reviews.

### Verification

- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run analyze` — pass locally.

---

## Phase 10 Complete

**Date:** 2026-04-09

### Goal

**Dependabot** for dependency and Actions updates, and **README** aligned with CI / tooling.

### Changes

- **`.github/dependabot.yml`** — weekly **npm** updates (root, max 10 open PRs); monthly **GitHub Actions** updates.
- **`README.md`** — documents **quality** commands (same sequence as CI), **format**, and **`npm run analyze`**.

### Verification

- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — pass locally.

---

## Phase 11 Complete

**Date:** 2026-04-09

### Goal

**Husky + lint-staged** for fast local feedback (small team, minimal CI time). **No Playwright** in default CI; **no extra minutes** on the main workflow.

### Changes

- **`husky`**, **`lint-staged`** dev dependencies; **`prepare`: `husky`** (runs on `npm install`).
- **`.husky/pre-commit`** — `npx lint-staged`.
- **`package.json` → `lint-staged`:** ESLint + Prettier on TS/JS; Prettier on JSON/CSS/MD/YAML.
- **`.github/workflows/ci.yml`** — **`HUSKY=0`** on `npm ci` so CI does not install Git hooks.
- **`README.md`** — short **Git hooks** section (`--no-verify` documented).

### Verification

- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — pass locally.

---

## Review follow-up (post–Phase 11)

**Date:** 2026-04-09

Addressing items from an independent pass over the remediation work.

| Item                                    | Action                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UTF-8 BOM** on `CollectionFilter.tsx` | Removed again (bytes verified: no `ef bb bf`). Added **`.editorconfig`** (`charset = utf-8`).                                                                                                           |
| **`public/images` size**                | Added **`npm run images:optimize`** (`scripts/optimize-public-images.mjs`, **`sharp`**). Run after changing assets; skips if `public/images` is missing.                                                |
| **Env validation**                      | **`app/lib/env.ts`** (Zod, `.passthrough()` for future keys), side-effect import in **`app/layout.tsx`**; **`.env.example`** committed.                                                                 |
| **Security headers**                    | **`next.config.ts` → `headers()`**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` on all routes; **`Strict-Transport-Security`** in **production** only (HTTPS). |
| **Folder / naming**                     | **README** “Where to put new code” + inspiration **TODO** comment on full-client page.                                                                                                                  |
| **Bundle baseline**                     | Documented in **README**: run **`npm run analyze`**, record First Load in this file when comparing phases.                                                                                              |

### Verification

- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` — pass locally.
