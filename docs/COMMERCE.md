# Commerce

Decision recorded 2026-08-13: build a real catalog, cart, checkout, payments,
and orders. This reversed the earlier "deliberately not planned" entry in
`docs/ROADMAP.md`. First implementation landed 2026-08-14.

Off by default. `COMMERCE_ENABLED=0` hides Collections, Cart, Checkout, Orders,
and Billing from the account rail and 404s those routes. That default is
deliberate: a checkout that looks finished but cannot charge reads to a shopper
as a completed purchase, which is worse than no checkout at all.

## Decisions taken

| Question   | Decision                                                        |
| ---------- | --------------------------------------------------------------- |
| Catalog    | Authored in-house; placeholder SKUs seeded by `prisma/seed.mjs` |
| Currency   | Multi-currency, priced per market (no runtime FX)               |
| Payments   | Provider adapter `disabled` / `test` / `stripe`                 |
| Fulfilment | Self-fulfilled, with the smallest correct order state machine   |

## Data model

| Model                   | Holds                                                     |
| ----------------------- | --------------------------------------------------------- |
| `Product` / `Variant`   | Authored catalog; only `status: active` is purchasable    |
| `VariantPrice`          | One authored amount per currency, unique per pair         |
| `Cart` / `CartItem`     | One open cart per user; unit price captured on add        |
| `Address`               | Saved shopper addresses                                   |
| `Order` / `OrderItem`   | Immutable snapshot of what was bought and shipped where   |
| `ProcessedPaymentEvent` | Webhook replay protection, keyed by the provider event id |
| `User.currency`         | Settlement currency for catalog, cart, and orders         |

`Budget.currency` and `RoomPlan.currency` remain **planning-side** fields and are
not authoritative for money that is actually charged. `User.currency` is.

## Money rules

- Integer cents everywhere. `src/lib/commerce/money.ts` is the only formatter,
  and it refuses non-integer or negative inputs rather than rounding them into a
  charge.
- Every supported currency has two decimals. Adding a zero-decimal currency
  (JPY, KRW) requires explicit minor-unit handling both there and in the payment
  provider, which expects the smallest unit — otherwise amounts are 100x wrong.
- Currency symbols are an explicit table, not `Intl` currency style: no locale
  renders SGD as "S$", and `en-SG` renders it as a bare "$", which is unsafe on a
  screen that can also show USD.
- Prices are authored per market. There is no runtime conversion, so a variant
  with no price in the shopper's currency is simply not offered there — a
  converted figure could not be traced back to a stored row.
- `CostLog.costUsd` is a `Decimal` for **LLM spend only**. It is not a commerce
  ledger and must not be reused as one.
- `DesignRecommendation` price _bands_ are LLM output and never purchasable. The
  prompt in `src/server/recommendations/service.ts` forbids inventing SKUs.

## Order state machine

```
pending_payment ──▶ paid ──▶ fulfilled
       │                │         │
       ▼                ▼         ▼
   cancelled         refunded ◀───┘
```

Transitions are applied with the permitted source status in the `WHERE` clause,
so a webhook redelivery racing an operator action cannot move an order twice. A
transition that matches nothing returns false — the normal outcome for a
duplicate event, not an error. A shopper may cancel only while payment is still
outstanding.

## Checkout ordering

`placeOrder` deliberately sequences its side effects:

1. resolve the cart and compute totals **server-side** (the client never sends a
   price)
2. open the payment session — no money moves yet, since the shopper has not
   reached the provider's page
3. write the order, its items, and empty the cart in one transaction

So a provider failure leaves the cart intact and nothing charged. The reverse
order risks an order with no payment, or a cleared cart the shopper cannot get
back. Replays are absorbed by `Order.idempotencyKey`, mirroring
`Message.clientMessageId`: the same key returns the original order.

The cart is emptied at step 3 because from that point the order is the record of
what was bought. If the shopper never pays, `restoreCartFromOrder` hands the
lines back — on `checkout.session.expired`, on an async payment failure, and when
the shopper cancels the unpaid order themselves. Restored lines keep the order's
prices, not today's catalog: those are the figures the shopper was shown.

## Payments

`COMMERCE_PAYMENT_PROVIDER` selects the adapter, mirroring the image-generation
pattern:

- `disabled` — a cart can be filled; checkout refuses
- `test` — settles locally without charging. Boot preflight **fails** if this is
  set in production outside `NEXT_PUBLIC_E2E=1` / `NODE_ENV=test`, because it
  would hand out stock for free
- `stripe` — a **hosted Checkout Session** over the REST API with `fetch`, keyed
  by the checkout idempotency key

The `stripe` / `@stripe/*` packages remain in the `eslint.config.mjs` blocklist
and are **not** installed: the integration is REST plus `node:crypto`, so nothing
needs to be unblocked. Signature verification is implemented by hand
(`verifyStripeSignature`), including the five-minute timestamp tolerance that
stops a captured request being replayed later.

### Why hosted, not an on-site card field

Placing an order returns a `redirectUrl` and the browser leaves for Stripe's
page. No card field is ever mounted here, so card data never touches this app or
its logs, and Stripe Elements — which would need the blocklisted SDK — is not
required. The cost is a redirect, and that a shopper can return before the
webhook does; Orders handles that case explicitly rather than assuming payment
succeeded.

Shipping and tax are sent as their own line items so the provider's page shows
the same breakdown as our summary. Stripe charges the **sum of the line items**,
not the total we computed, so `createStripeCheckoutSession` refuses outright if
those two figures disagree — otherwise a bug in totals would quietly charge the
shopper something other than their order total.

Returning from the hosted page proves nothing: `success_url` is a URL the shopper
could type. Only the webhook marks an order paid. `/account/orders` therefore
polls briefly on return, and if the webhook has not arrived it says the payment
is still being confirmed rather than showing it as complete.

## Webhook

`POST /api/webhooks/stripe` is the only unauthenticated write surface in the app.
It establishes trust itself, in order:

1. HMAC over the **raw** body, constant-time compared, within the timestamp
   tolerance
2. replay protection by inserting the provider event id as a primary key
3. only then a status-guarded transition

It must never reach for `requireApiSession` — Stripe has no session, and that
would be the wrong fix for a 401. It answers 200 even when nothing matched, since
a retry cannot change the outcome and a non-2xx makes the provider hammer the
endpoint.

Which field identifies the order depends on the event family, and guessing wrong
means an event that silently matches nothing:

| Event family         | Order matched on                                            |
| -------------------- | ----------------------------------------------------------- |
| `checkout.session.*` | the session id, stored as `Order.paymentRef`                |
| `payment_intent.*`   | `data.object.id`, the intent itself                         |
| `charge.*` (refunds) | `data.object.payment_intent`; the charge id matches nothing |

A hosted order starts life knowing only its session id, so
`checkout.session.completed` also records `data.object.payment_intent` into
`Order.paymentIntentRef`. Without that, a later refund — which arrives against
the intent, never the session — would match no order and never be reflected.
Lookups accept either reference.

`checkout.session.completed` with `payment_status: "unpaid"` is _not_ treated as
paid: delayed methods complete the session before settling, and the async
success or failure event decides the outcome.

## Surfaces

| Route                  | Backed by                                         |
| ---------------------- | ------------------------------------------------- |
| `/account/collections` | Catalog in the shopper's currency, "Add to cart"  |
| `/account/cart`        | Server cart, quantity stepper, live totals        |
| `/account/checkout`    | Address form, totals, place order                 |
| `/account/orders`      | Real orders, status filters, cancel while pending |
| `/account/billing`     | Invoices derived from paid and refunded orders    |

Collections is where buying starts because the approved design hangs "Add to
cart" off a piece there. Billing deliberately does **not** list saved cards: card
details never reach this app, and a list of "•••• 4242" rows implied a vault that
does not exist. It also omits a GST registration number rather than printing a
placeholder one on something that looks like an invoice.

## Known gaps

- **Order retention vs account deletion.** Account deletion is a **soft** delete
  of `User`, so Prisma `onDelete: Cascade` never fires. `deleteAccount` wipes
  `Address` and `Cart` explicitly, and **retains** `Order` / `OrderItem` for the
  SG 5-year transaction-record requirement while anonymizing the shipping
  snapshot. See `docs/ACCOUNT_HARDENING.md`.
- **Resuming a hosted session.** The session URL is not stored, so a shopper who
  abandons the provider's page cannot click back into that same payment. Cancel
  the unpaid order instead, which returns the items to the cart. Stripe expires
  the session either way and the expiry event releases the order.
- **Live Stripe is unverified end to end.** The REST calls, event parsing, and
  the amount guard are unit-tested against a mocked transport, and the state
  machine is tested against a real database, but no test talks to Stripe. Run one
  test-mode purchase with `STRIPE_SECRET_KEY=sk_test_...` and a forwarded webhook
  before opening this to shoppers.
- **Shipping and tax are placeholders.** A flat fee and a single percentage, not
  a destination-aware tax engine. GST registration status is not modelled.
- **No saved payment methods, refund initiation, returns/RMA, inventory counts,
  or partial shipments.** Refunds apply only when the provider reports them.
- **Product images.** `Upload` is per-user and private, so it is unsuitable for
  public catalog imagery; Collections renders the design's placeholder thumbnail.
