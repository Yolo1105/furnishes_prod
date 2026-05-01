# Commerce & hardening checklist (non-mock)

Use this after the auth / API hardening work. **Mock-auth and demo-login cleanup are out of scope here.**

## Recommended starting point (do this first)

**Trace order creation end-to-end, then align code with docs.**

Until you know exactly where `Order` rows are created and how they reach `checkout/intent`, wiring Stripe → Inngest or building fulfillment will be guesswork. After that, implement or document `/api/orders` so the checkout flow is honest.

See **Phase 1** below.

---

## Phase 1 — Order flow truth (blocking)

- [x] **Trace checkout → DB**: previously there was **no** `prisma.order.create` in the app; checkout UI still used mock data. **`POST /api/orders`** now creates `Order` + `OrderItem` from the user’s cart and clears those cart lines.
- [x] **Resolve `/api/orders` mismatch**: implemented **`app/api/orders/route.ts`** (`POST`); `app/api/checkout/intent/route.ts` documents the request shape.
- [x] **Confirm webhook inputs**: `order_id` is set on every PaymentIntent in `createPaymentIntent` (`lib/payments/stripe.ts`); webhook reads `metadata.order_id` and skips if order already `paid` / `processing`.

## Phase 2 — Automation (after Phase 1)

- [x] **Stripe webhook → Inngest**: `sendOrderPaidEvent` in `app/api/webhooks/stripe/route.ts` sends `order/paid` when `INNGEST_EVENT_KEY` is set; `paid` + webhook retry re-sends so fulfillment can recover; `processing`+ skips duplicate pipeline work.
- [x] **`handleOrderPaid` in `lib/jobs/inngest.ts`**: **`fulfillment-integration`** calls **`dispatchPaidOrderFulfillment`** (`lib/commerce/fulfillment-dispatch.ts`): optional **`FULFILLMENT_WEBHOOK_URL`** POST (`furnishes.order.paid`); otherwise stub log `commerce.fulfillment.stub` + Sentry breadcrumb. **`verify:prod`** warns in production if commerce is on but the webhook URL is unset.
- [x] **Idempotency**: Stripe **`ProcessedStripeEvent`** table dedupes by `evt_...` id before handlers run; order-status guards remain (`processing`/`shipped`/`delivered` skips; `mark-processing` uses `updateMany` where `status: "paid"` for duplicate `order/paid` events).

## Phase 3 — Verification

Procedure and checklist: **`docs/seed-readiness/03-verification.md`**.

- [ ] Run **`npm run verify:prod`** / **`npm run verify:prod:local`** — step-by-step: **`docs/VERIFY_ENV_AND_STAGING.md`** §1 (Postgres `DATABASE_URL`, auth secret, then fix failures until green).
- [ ] Staging: place test order → confirm `paid` → confirm job runs (logs / Inngest dashboard) — **`docs/VERIFY_ENV_AND_STAGING.md`** §2.

## Phase 4 — Security & hygiene (non-blocking for MVP commerce)

- [x] **CSP**: production `Content-Security-Policy` from `lib/site/content-security-policy.ts` (see file for rationale; `connect-src` allows `https:` / `wss:` for Stripe, Sentry, R2, OAuth).
- [x] **bcrypt vs bcryptjs**: **`bcrypt` only** — signup, reset, security actions, and tests use `import * as bcrypt from "bcrypt"`; `bcryptjs` removed from dependencies.

## Phase 5 — Cleanup (optional)

- [x] **Inspiration page**: server `app/(site)/inspiration/page.tsx` (metadata + entry); interactive Framer Motion UI in `components/site/inspiration/inspiration-page-client.tsx`.
- [x] **`CollectionFilter`**: search draft syncs from URL `q` during render when `state.q` changes (back/forward, clear) — no `set-state-in-effect` suppression.
- [x] **`image-gen-workspace`**: Fal pipeline images use **`next/image`**; **`next.config.ts`** allows **`v3.fal.media`** (`remotePatterns`).
- [x] **`ProfileContent`** OAuth avatars — **`next/image`** for allowlisted hosts (Google `lh*.googleusercontent.com`, GitHub **`avatars.githubusercontent.com`**); other URLs remain **`<img>`** — see **`lib/site/oauth-avatar-image.ts`**.

## Phase 6 — Product (parallel)

- [ ] “Coming soon” surfaces (settings, promo codes, room planner, etc.) — prioritize with product, not this checklist.

---

## Checkout UI (wired)

- **`GET /api/checkout/context`** — signed-in cart, addresses, payment methods + `commerceBackendEnabled`.
- Wizard stores selections in **`sessionStorage`** (`lib/site/commerce/checkout-session-storage.ts`).
- **Review** → **`POST /api/orders`** → **`/checkout/pay/[orderId]`** (Stripe Payment Element) when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set; else success page only.
- Commerce API off / unsigned users still get **mock** checkout for demos.

## Quick file pointers

| Area             | Where to look                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Stripe → paid    | `app/api/webhooks/stripe/route.ts`                                                            |
| Inngest handler  | `lib/jobs/inngest.ts` (`handleOrderPaid`)                                                     |
| Checkout intent  | `app/api/checkout/intent/route.ts`                                                            |
| Checkout context | `app/api/checkout/context/route.ts`                                                           |
| Stripe pay UI    | `components/commerce/checkout-stripe-pay.tsx`                                                 |
| Prod env check   | `docs/VERIFY_ENV_AND_STAGING.md` · `npm run verify:prod` / `verify:prod:local`                |
| Inspiration page | `app/(site)/inspiration/page.tsx` + `components/site/inspiration/inspiration-page-client.tsx` |
| Security headers | `next.config.ts` (`headers`) + `lib/site/content-security-policy.ts`                          |
