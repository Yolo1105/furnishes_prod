# Phase 5 — Eva dashboard UI (done)

**Goal (from Phase 4):** Port the reference **DashboardLayout**, **ChatView**, providers, and wire **`ChatProvider`** to **`/api/chat`** + **`/api/extract`**.

## Delivered

| Area             | Location                                                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromeless route | `app/(chromeless)/chatbot/page.tsx`, `layout.tsx`, `eva-dashboard-theme.css`                                                                          |
| Shell            | `components/eva-dashboard/layout/dashboard-layout.tsx`, sidebars, `main-content`, `navbar`                                                            |
| Chat             | `components/eva-dashboard/views/chat-view.tsx`, `chat/chat-bubble.tsx`, `chat/chat-avatar.tsx`                                                        |
| Client state     | `lib/eva-dashboard/contexts/*` (`chat-context`, `current-conversation`, `current-preferences`, `workspace`, `app-context`)                            |
| API wiring       | `lib/eva-dashboard/api/client.ts` — `API_ROUTES.chat` → `/api/chat`, `extract` → `/api/extract`, plus conversations, preferences, export, share, etc. |
| Toaster          | `components/eva/eva-toaster.tsx` (chatbot layout)                                                                                                     |

`ChatProvider` streams from **`POST /api/chat`** and calls **`POST /api/extract`** after assistant messages (see `lib/eva-dashboard/contexts/chat-context.tsx`).

## Reference parity

- **Inspiration** links to **`/chatbot`** via `app/data/inspiration-content.ts` (`INSPIRATION_TOOLS`).
- Styling is scoped under **`.eva-dashboard-root`** (not global marketing CSS).

## Next (Phase 6)

See **`phase-6-launch.md`** — production deploy, env, RAG seeding, and optional Milestone B polish.
