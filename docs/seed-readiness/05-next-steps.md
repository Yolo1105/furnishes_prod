# Phase 5 — What to do next (after seed-readiness 1–4)

Engineering work in **`docs/seed-readiness/`** Phases **1–4** is **landed in the repo**. What remains is **operational**, **product**, or **maintenance**.

## 0. Local parity with CI (before env verification)

Same gates as the **`verify`** CI job (minus `next build`): `npm run check` runs typecheck, Prettier, ESLint, and Vitest.

```bash
npm run check
```

Then **`npm run build`** (with **`NEXTAUTH_URL`** + **`AUTH_SECRET`** set if your build needs them).

## 1. Close commerce Phase 3 (blocking for “we verified staging”)

Follow **`docs/seed-readiness/03-verification.md`** end-to-end:

1. **`npm run verify:prod`** or **`npm run verify:prod:local`** until green (**`docs/VERIFY_ENV_AND_STAGING.md`** §1).
2. Staging smoke (**§2**): sign-in → checkout → Stripe test pay → webhooks **2xx** → DB **`paid`** → Inngest **`order/paid`**.
3. Check the boxes under **Phase 3** in **`docs/COMMERCE_HARDENING_CHECKLIST.md`**.

Optional: open a **Release verification** issue from the GitHub template (`.github/ISSUE_TEMPLATE/release-verification.md`) to track evidence per release.

## 2. Product: commerce Phase 6

**`docs/COMMERCE_HARDENING_CHECKLIST.md` Phase 6** — “coming soon” surfaces (settings, promo codes, room planner, etc.). Prioritize with product; not part of seed-readiness engineering phases.

## 3. Maintenance

- Merge **Dependabot** PRs when CI is green.
- Keep **GitHub Actions** secrets for **E2E** (`docs/seed-readiness/01-e2e-setup.md`) so the **`e2e`** job exercises checkout.
- Add OAuth avatar hosts in **`lib/site/oauth-avatar-image.ts`** if you add OAuth providers beyond Google/GitHub.

## References

| Topic              | Doc                                                |
| ------------------ | -------------------------------------------------- |
| Env + staging runs | **`docs/VERIFY_ENV_AND_STAGING.md`**               |
| Boot guards        | **`docs/seed-readiness/02-production-guards.md`**  |
| ADR eva-dashboard  | **`docs/adr/0011-eva-dashboard-eslint-bypass.md`** |
