# Account Architecture Refactor — Inventory & Status

**Status:** Architecture refactor complete for route ownership · CSS scoped · fonts/metadata owned by layout · commerce & some profile editors deferred  
**Date:** 2026-07-22  
**Contract:** Architecture and integration only. No design, copy, layout, motion, or visible IA changes.

### Current state (unambiguous)

| Item                        | State                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Prototype removed           | **Yes** (`studio-prototype/` deleted + architecture guard)                                                  |
| Routes own pages            | **Yes** — every `/account/*` paints React through `AccountShell`                                            |
| Core domains API-integrated | **Yes** — style/budget/privacy/settings/conversations/projects/uploads/image-gen/inspiration/help           |
| Dashboard / activity        | **Server-aggregated** from real domain reads (`getAccountDashboard` / `listAccountActivity`)                |
| Commerce screens            | **Preserved UI, backend deferred** (cart/checkout/orders/billing) — not Product-complete                    |
| CSS scoping                 | **Done** — selectors under `.furnishes-account`                                                             |
| Fonts / titles              | **Done** — `next/font/google` + route `metadata` / `generateMetadata`                                       |
| Mobile nav                  | **Intentional exception** — approved design keeps the persistent rail at narrow widths (no separate drawer) |

---

## 1. Current architecture (signed off)

```
Every /account/* :
  AccountLayout → requireCurrentSession → AccountShell → AccountShellClient
    → React AccountRail (<Link>; chat rail on conversation detail)
    → <section.stage>{children}</section>
         → route-owned React page (server load + client mutations)
```

| Concern         | State                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Route ownership | All Account routes paint React children                                  |
| AccountShell    | Always React rail + `{children}`                                         |
| Navigation      | React `<Link>` rail; URL authoritative                                   |
| Persistence     | `/api/account/*` for product surfaces; commerce UI deferred (static)     |
| AuthZ           | Layout session + owner/stranger API E2E                                  |
| Lint            | No studio exceptions                                                     |
| CSS             | `shell/account-studio.css` — selectors scoped under `.furnishes-account` |
| Fonts / titles  | Account layout `next/font` + page metadata                               |
| Mobile nav      | Persistent rail at all widths (approved design; no drawer)               |
| Prototype       | **Deleted** — guarded by `pnpm check:account-architecture`               |

---

## 2. Account URL routes

Every page under `src/app/(account)/account/**` is a route-owned React page
(server session + domain service → client page). Painted UI goes through
`AccountShell` `{children}` — no prototype host.

| URL                                       | Studio `initialView` | Migration status | Notes                                                               |
| ----------------------------------------- | -------------------- | ---------------- | ------------------------------------------------------------------- |
| `/account`                                | `dashboard`          | **Done**         | `DashboardPage` + `getAccountDashboard`                             |
| `/account/activity`                       | `activity`           | **Done**         | `ActivityPage` + `listAccountActivity`                              |
| `/account/style`                          | `style`              | **Done**         | Route-owned `StylePage` + style API                                 |
| `/account/budget`                         | `budget`             | **Done**         | Route-owned `BudgetPage` + budget API                               |
| `/account/privacy`                        | `privacy`            | **Done**         | Route-owned `PrivacyPage` + privacy APIs                            |
| `/account/conversations`                  | `conversations`      | **Done**         | Route-owned `ConversationsPage` + list/create APIs                  |
| `/account/conversations/[conversationId]` | `chat`               | **Done**         | Route-owned `ChatPage` + GET/POST messages; chat rail               |
| `/account/shortlist`                      | `shortlist`          | **Done**         | Alias of Inspiration Board (commerce deferred)                      |
| `/account/inspiration`                    | `shortlist`          | **Done**         | Route-owned `InspirationPage` + inspiration APIs                    |
| `/account/projects`                       | `projects`           | **Done**         | Route-owned `ProjectsPage` + list/create APIs                       |
| `/account/projects/[projectId]`           | `projects`           | **Done**         | Route-owned `ProjectDetailPage` + GET/PUT/DELETE/comments/approvals |
| `/account/uploads`                        | `uploads`            | **Done**         | Route-owned `UploadsPage` + upload/download/delete                  |
| `/account/image-generation`               | `imagegen`           | **Done**         | Route-owned `ImageGenerationPage` + create/poll/cancel/retry/delete |
| `/account/orders`                         | `orders`             | **Done**         | UI preserve — `OrdersPage` (no commerce backend)                    |
| `/account/billing`                        | `billing`            | **Done**         | UI preserve — `BillingPage` (no commerce backend)                   |
| `/account/settings`                       | `settings`           | **Done**         | Route-owned `SettingsPage`                                          |
| `/account/help`                           | `help`               | **Done**         | Route-owned `HelpPage` + `POST /api/account/help`                   |
| `/account/cart`                           | `cart`               | **Done**         | UI preserve — `CartPage` (no commerce backend)                      |
| `/account/checkout`                       | `checkout`           | **Done**         | UI preserve — `CheckoutPage` (no commerce backend)                  |

Supporting files:

| File                               | Behavior                 |
| ---------------------------------- | ------------------------ |
| `layout.tsx`                       | Session + `AccountShell` |
| `loading.tsx`                      | `"Loading account…"`     |
| `error.tsx`                        | Error boundary UI        |
| `conversations/[id]/not-found.tsx` | Exists; rarely reached   |
| `projects/[id]/not-found.tsx`      | Exists; rarely reached   |

### Path → view map (`account-view-paths.ts`)

Authoritative URL ↔ view key map for rail active state and titles. Conversation
detail uses the chat rail; all other Account routes use the main nav rail.

---

## 3. Historical studio views (reference only)

Former `data-view` / `go(view)` keys — now mapped to Next routes via
`account-view-paths.ts`. Kept for archaeology against `reference/account.jsx`.

| View key        | Surface            | In left nav    | Notes                                         |
| --------------- | ------------------ | -------------- | --------------------------------------------- |
| `dashboard`     | Canvas home        | Yes (Overview) | Default; Inspiration mode [01]                |
| `style`         | Wireframe          | Yes            |                                               |
| `budget`        | Wireframe          | Yes            |                                               |
| `privacy`       | Wireframe          | Yes            |                                               |
| `conversations` | Wireframe list     | Yes            |                                               |
| `chat`          | Full Eva workspace | Mode tab [03]  | Now `/account/conversations/[id]` + chat rail |
| `shortlist`     | Wireframe          | Yes            | Also target of `/account/inspiration`         |
| `projects`      | Wireframe          | Yes            |                                               |
| `uploads`       | Wireframe          | Yes            |                                               |
| `imagegen`      | Workspace          | Mode tab [02]  |                                               |
| `orders`        | Wireframe          | Yes            |                                               |
| `billing`       | Wireframe          | Yes            |                                               |
| `settings`      | Wireframe          | Yes            |                                               |
| `help`          | Wireframe          | Yes            |                                               |
| `cart`          | Wireframe          | No             | Dashboard door                                |
| `checkout`      | Wireframe          | No             | From cart                                     |
| `activity`      | Wireframe          | No             | Dashboard “View all activity”                 |

Chat rail sections (`data-cnav` / `SEC`): `project`, `activity`, `files`, `discover`, `recs` (+ new/recent handlers).

---

## 4. Navigation labels (must preserve exactly)

From studio markup / `account-navigation.ts`:

**Workspace modes**

| Index | Label       | Target                                              |
| ----- | ----------- | --------------------------------------------------- |
| [01]  | Inspiration | `/account` (and non-chat / non-imagegen views)      |
| [02]  | Image Gen   | `/account/image-generation`                         |
| [03]  | Chat        | `/account/conversations` (studio opens `chat` view) |

**Left rail groups**

| Group            | Items                                          |
| ---------------- | ---------------------------------------------- |
| Overview         | Dashboard                                      |
| How Eva Knows Me | Style Profile · Budget · Eva’s Memory & Data   |
| Design Work      | Conversations · Shortlist · Projects · Uploads |
| Orders & Account | Orders · Billing · Settings · Help & Feedback  |

Taglines (preserve):

- Inspiration: `A design studio where rooms move off-template`
- Generate: `See the room before you build it`
- Chat: `Every room starts as a conversation`

---

## 5. Inspectors, overlays, dialogs

### Side inspector (`wf-insp` / `INSP` keys)

`read`, `piece`, `upload`, `invoice`, `editcard`, `order`, `project`, `thread`, `editfield`, `signout`, `changepw`, `newproject`, `new`, `startreturn`, `addcard`, `info`

### Other overlays

| Overlay                | Mechanism                              |
| ---------------------- | -------------------------------------- |
| Persona picker         | `data-pickmask` / `.wf-picker`         |
| Source modal           | `data-srcmask` / `.wf-srcmodal`        |
| Entity popover         | `data-entpop`                          |
| Selection tool         | `data-seltool`                         |
| Crumb session dropdown | `data-crumbdd`                         |
| Toast / undo toast     | `.wf-toast` / undo variant             |
| Mobile nav drawer      | Studio rail collapse / drawer behavior |

Most product mutations persist via `/api/account/*`. Commerce inspectors and
password/profile field editors are local UI with toasts only (no commerce/auth
password APIs this pass).

---

## 6. Interactive controls → classification

| Control area                                      | Classification         | Real backend today?                               | Target                                                 |
| ------------------------------------------------- | ---------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| Rail / mode / door                                | Navigation             | **Wired** (`<Link>` / `router.push`)              | React `AccountRail`                                    |
| Style evidence / memory edits                     | Server mutation        | **Wired**                                         | `PUT /api/account/style`                               |
| Budget chips / values                             | Server mutation        | **Wired**                                         | `PUT /api/account/budget`                              |
| Privacy toggles / export / clear / delete         | Server mutation        | **Wired**                                         | privacy routes                                         |
| Settings notifications / sessions / verify        | Server mutation        | **Wired**                                         | settings routes                                        |
| Help submit                                       | Server mutation        | **Wired**                                         | `POST /api/account/help`                               |
| Conversations list / new thread                   | Navigation + mutation  | **Wired**                                         | conversations APIs                                     |
| Chat send / stop / retry / feedback / attach      | Chat action            | Send + feedback wired; stop/retry/attach deferred | messages + feedback                                    |
| Project create / edit / comment / approval        | Project action         | **Wired** (list + detail)                         | project APIs                                           |
| Upload / download / delete                        | Upload                 | **Wired**                                         | upload APIs                                            |
| Image gen create / poll / cancel / retry / delete | Generation lifecycle   | **Wired**                                         | image-generation APIs                                  |
| Shortlist / Inspiration edits                     | Inspiration / commerce | Inspiration **wired**; commerce deferred          | Wire Inspiration; preserve Shortlist visuals this pass |
| Orders / cart / checkout / billing                | Commerce UI            | **UI preserved** (no APIs)                        | Preserve UI; document deferred backend                 |
| Inspector open/close                              | Local UI / overlay     | N/A                                               | Accessible React inspector                             |
| Toast                                             | Local UI               | N/A                                               | `role="status"` / `alert`                              |
| Sign out                                          | Session action         | Auth logout exists                                | Real logout                                            |

---

## 7. Existing APIs (`src/app/api/account/`)

There are **no** top-level `src/app/api/conversations|projects|uploads` trees — all Account HTTP is under `/api/account/*`.

| Endpoint                                                  | Methods          | Server module                               |
| --------------------------------------------------------- | ---------------- | ------------------------------------------- |
| `/api/account/style`                                      | GET, PUT         | `server/account/style-profile.ts`           |
| `/api/account/budget`                                     | GET, PUT         | `server/account/budget.ts`                  |
| `/api/account/privacy/memory`                             | PUT              | `server/account/privacy.ts`                 |
| `/api/account/privacy/export`                             | GET              | same                                        |
| `/api/account/privacy/conversations-export`               | GET              | same                                        |
| `/api/account/privacy/clear`                              | POST             | same                                        |
| `/api/account/privacy/delete`                             | POST             | same                                        |
| `/api/account/conversations`                              | GET, POST        | `server/conversations/service.ts`           |
| `/api/account/conversations/[id]`                         | GET              | same                                        |
| `/api/account/conversations/[id]/messages`                | POST             | same                                        |
| `/api/account/conversations/[id]/messages/[mid]/feedback` | POST             | same                                        |
| `/api/account/projects`                                   | GET, POST        | `server/projects/service.ts`                |
| `/api/account/projects/[id]`                              | GET, PUT, DELETE | same                                        |
| `/api/account/projects/[id]/comments`                     | POST             | same                                        |
| `/api/account/projects/[id]/approvals`                    | POST             | same                                        |
| `/api/account/uploads`                                    | GET, POST        | `server/uploads/service.ts`                 |
| `/api/account/uploads/[id]`                               | DELETE           | same                                        |
| `/api/account/uploads/[id]/download`                      | GET              | same                                        |
| `/api/account/inspiration`                                | GET, POST        | `server/inspiration/inspiration-service.ts` |
| `/api/account/inspiration/[itemId]`                       | PATCH, DELETE    | same                                        |
| `/api/account/image-generations`                          | GET, POST        | `server/image-generation/*`                 |
| `/api/account/image-generations/[id]`                     | GET, DELETE      | same                                        |
| `/api/account/image-generations/[id]/refresh`             | POST             | same                                        |
| `/api/account/image-generations/[id]/cancel`              | POST             | same                                        |
| `/api/account/image-generations/[id]/retry`               | POST             | same                                        |
| `/api/account/settings/notifications`                     | PUT              | `server/account/settings.ts`                |
| `/api/account/settings/resend-verification`               | POST             | same / auth                                 |
| `/api/account/settings/sessions/[sessionId]`              | DELETE           | auth session                                |
| `/api/account/settings/sessions/revoke-others`            | POST             | auth session                                |
| `/api/account/help`                                       | POST             | `server/account/settings.ts`                |

Related auth (outside account folder): `/api/auth/{login,signup,logout,forgot-password,reset-password,verify-email,demo}`.

---

## 8. Prisma models (Account-relevant)

Present: `User`, `Session`, `EmailToken`, `StyleProfile`, `Budget`, `NotificationPrefs`, `Conversation`, `Message`, `MessageFeedback`, `Project`, `ProjectMember`, `ProjectComment`, `ProjectApproval`, `ProjectTimelineEvent`, `Upload`, `ImageGeneration`, `InspirationItem`, `HelpRequest`, `SecurityEvent`.

**Absent (commerce APIs deferred; UI preserved as static React):** Order, Cart, Invoice, Billing, PaymentMethod, Return, Delivery.

---

## 9. Lint / CI (post-prototype)

### ESLint (`eslint.config.mjs`)

- Global ban of `dangerouslySetInnerHTML` / `innerHTML` assignment in production `src/**`
- Studio prototype lint exceptions **removed** with the prototype

### CI (`.github/workflows/ci.yml`)

Present: `e2e-account-core`, `e2e-account-creative`, `e2e-account-visual`,
`e2e-landing`, plus format/typecheck/lint/unit/knip/reference/architecture/build.
Architecture guard: `pnpm check:account-architecture` (also in `pnpm check`).

---

## 10. Account E2E (route-owned)

| Spec                                        | Focus                                      |
| ------------------------------------------- | ------------------------------------------ |
| `e2e/account-shell.spec.ts`                 | Auth redirect, rail, modes, logout         |
| `e2e/account-profile.spec.ts`               | Style/budget/privacy API + UI              |
| `e2e/account-projects.spec.ts`              | Projects API + UI detail                   |
| `e2e/account-conversations.spec.ts`         | Conversations + chat send/feedback         |
| `e2e/account-uploads.spec.ts`               | Uploads API + UI                           |
| `e2e/account-inspiration.spec.ts`           | Inspiration Board API + UI                 |
| `e2e/account-image-generation.spec.ts`      | Image-gen lifecycle + UI                   |
| `e2e/account-help-commerce.spec.ts`         | Help submit + commerce/settings inspectors |
| `e2e/account-security.spec.ts`              | Auth flows                                 |
| `e2e/account-architecture-baseline.spec.ts` | Visual capture + compare                   |
| `e2e/account-helpers.ts`                    | Seed owner/stranger cookies                |

---

## 11. Visual baseline

Directory: `docs/account-architecture-baseline/`

Required captures (fixed viewports 1440×900, 1280×800, 1024×768, 390×844, 360×800):

| Asset                          | Route / state                                  |
| ------------------------------ | ---------------------------------------------- |
| `dashboard-desktop.png`        | `/account`                                     |
| `dashboard-mobile.png`         | `/account` @ 390                               |
| `activity-desktop.png`         | `/account/activity`                            |
| `style-desktop.png`            | `/account/style`                               |
| `budget-desktop.png`           | `/account/budget`                              |
| `privacy-desktop.png`          | `/account/privacy`                             |
| `conversations-desktop.png`    | `/account/conversations`                       |
| `conversation-desktop.png`     | Chat workspace (studio `chat` view)            |
| `projects-desktop.png`         | `/account/projects`                            |
| `project-detail-desktop.png`   | Project inspector open if available            |
| `uploads-desktop.png`          | `/account/uploads`                             |
| `image-generation-desktop.png` | `/account/image-generation`                    |
| `inspiration-desktop.png`      | `/account/inspiration` (shortlist paint today) |
| `settings-desktop.png`         | `/account/settings`                            |
| `help-desktop.png`             | `/account/help`                                |
| `navigation-mobile.png`        | Mobile nav open                                |
| `inspector-open-desktop.png`   | Inspector open                                 |
| `dialog-open-desktop.png`      | Dialog / confirm open                          |
| `chat-mobile.png`              | Chat @ 390                                     |

**Baseline capture status:** Done.  
**Visual regression status:** **Approved** — `pnpm test:e2e:account:visual` capture+compare ≤8% vs this folder (2026-07-22; refreshed after CSS scope / next/font / live dashboard). Inspiration shelf keeps wireframe placeholders (no seed 1×1 PNG as cover).

---

## 12. Backend gaps (visible UI without API)

| Visible UI                                    | Gap                                     | This-pass decision                                                      |
| --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Orders / deliveries / returns                 | No Prisma / API                         | Preserve UI; scope review deferred                                      |
| Cart / Checkout                               | No Prisma / API                         | Preserve UI; scope review deferred                                      |
| Billing / cards / invoices                    | No Prisma / API                         | Preserve UI; scope review deferred                                      |
| Activity timeline                             | Aggregated from domains                 | **Done** — `listAccountActivity` (Orders filter empty until commerce)   |
| Style hero / property type                    | Style API                               | **Done** — `getFullStyleProfile`; quiz/palette/memory fixtures deferred |
| Settings profile editors / password           | No dedicated APIs                       | Deferred — no fake success toast                                        |
| Shortlist commerce shelf vs Inspiration Board | Domain mismatch; Inspiration APIs exist | Preserve Shortlist visuals; document deferred product decision          |
| Dynamic `[conversationId]` / `[projectId]`    | Studio ignores IDs                      | **Done** — authorized load + `notFound()`                               |
| In-app `go(view)` without URL sync            | Breaks Back/Forward after in-app nav    | **Done** — real Links                                                   |

For Style, Budget, Privacy, Settings, Help, Conversations, Projects, Uploads, Image Generation, Inspiration: **backend exists — connect UI; do not rewrite services.**

---

## 13. Scope notes (deferred product decisions)

`docs/ARCHITECTURE.md` / `docs/PHASE_2_PROGRESS.md` classify cart, checkout, orders, product billing, and product shortlist as commerce-excluded. **This architecture pass still preserves every currently painted studio screen and route** so design and content do not change. Product-scope removal or Inspiration-Board IA replacement happens in a **separate PR** after route-owned React parity.

---

## 14. Target feature structure (post-migration)

```
src/features/account/
├── shell/          AccountShell(+Client), Rail, Header, MobileNav, OverlayHost, CSS
├── primitives/     PageHeader, Cell, Metric, Table, Tabs, Empty, Inspector, Dialog, Toast, Field, Toggle
├── dashboard/
├── activity/
├── profile/        style, budget, privacy (or split folders)
├── conversations/
├── projects/
├── uploads/
├── image-generation/
├── inspiration/
├── settings/
├── help/
├── account-api.ts
├── account-errors.ts
└── account-types.ts
```

Delete `studio-prototype/` only after full visual + workflow parity. **Done.**

---

## 15. Migration sequence & checklist

| #   | Slice                                                   | Status                                                                                      |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Inventory (this doc)                                    | **Done**                                                                                    |
| 2   | Visual baseline capture                                 | **Done** (`docs/account-architecture-baseline/`)                                            |
| 3   | Restore AccountShell children + real links              | **Done** — React `AccountRail` with `<Link>`s; stage `{children}`                           |
| 4   | Dashboard                                               | **Done** — `DashboardPage` + `getAccountDashboard`                                          |
| 5   | Activity                                                | **Done** — `ActivityPage` + `listAccountActivity`                                           |
| 6   | Style                                                   | **Done** — `StylePage` + `getFullStyleProfile`; quiz/fixtures deferred                      |
| 7   | Budget                                                  | **Done** — route-owned `BudgetPage` + GET/PUT budget API                                    |
| 8   | Privacy                                                 | **Done** — route-owned `PrivacyPage` + memory/export/clear/delete                           |
| 9   | Settings                                                | **Done** — route-owned `SettingsPage` + notifications save                                  |
| 10  | Conversations list                                      | **Done** — route-owned `ConversationsPage` + list/create                                    |
| 11  | Conversation detail / chat                              | **Done** — route-owned `ChatPage` + chat rail; send/feedback APIs                           |
| 12  | Projects list                                           | **Done** — route-owned `ProjectsPage` + list/create                                         |
| 13  | Project detail                                          | **Done** — route-owned `ProjectDetailPage` + GET/update/comment/approval                    |
| 14  | Uploads                                                 | **Done** — route-owned `UploadsPage` + upload/download/delete                               |
| 15  | Image Generation                                        | **Done** — route-owned `ImageGenerationPage` + poll helpers                                 |
| 16  | Inspiration / Shortlist                                 | **Done** — route-owned `InspirationPage` (both URLs)                                        |
| 17  | Help                                                    | **Done** — route-owned `HelpPage` + submit API                                              |
| 18  | Orders / Billing / Cart / Checkout (UI-only preserve)   | **Done** — static React ports, no commerce APIs                                             |
| 19  | Remaining inspectors / dialogs / overlays               | **Done** — commerce order/invoice/card + settings changepw/edit/signout panels              |
| 20  | Replace prototype E2E                                   | **Done** — help/commerce/settings inspector coverage; core suite updated                    |
| 21  | Remove prototype + lint exceptions + architecture guard | **Done** — `studio-prototype/` deleted; `check:account-architecture`                        |
| 22  | Full visual regression + CI                             | **Done** — capture+compare suite; ≤8% threshold; wired as `test:e2e:account:visual`         |
| 23  | Docs signoff                                            | **Done** — current-state table; commerce/mobile/CSS/fonts unambiguous                       |
| 24  | CSS scope + fonts/metadata + data honesty               | **Done** — scoped CSS; next/font; dashboard/activity/style models; deferred actions labeled |

---

## 16. Definition of done (tracking)

See master prompt §32. Account architecture refactor **signed off** (2026-07-22):

- [x] Prototype directory deleted
- [x] Every route owns its page and paints children through AccountShell
- [x] Visible mutations hit real APIs (or documented commerce deferrals with preserved UI)
- [x] Authorization tests for owner / unrelated user (and roles where applicable)
- [x] Visual parity approved against `docs/account-architecture-baseline/` (`test:e2e:account:visual`)
- [x] Landing E2E still green
- [x] Account CSS scoped under `.furnishes-account`
- [x] Fonts via `next/font`; titles via metadata / `generateMetadata`
- [x] Mobile nav: persistent rail documented as approved-design exception
- [x] No design or copy changes (architecture/integration only)

---

## 17. Honest status legend

| Label                           | Meaning                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| Prototype migration in progress | Studio still owns paint                                    |
| Route-owned                     | Next page renders domain React; URL authoritative          |
| API-integrated                  | Visible mutations persist via `/api/account/*`             |
| Authorization-tested            | Owner / stranger (and roles) covered                       |
| Visual parity approved          | Baseline comparison accepted                               |
| Deferred                        | Explicitly out of this architecture PR or awaiting backend |
