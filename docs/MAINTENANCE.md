# Maintenance & follow-up checks

Use this when you ask to **verify nothing is left to fix** after refactors (removed components, layout changes, auth flows).

## Error boundaries

- **`app/error.tsx`** — User-facing text is intentionally generic. Do **not** render `error.message` to visitors; log the full error with `console.error` (or Sentry) for debugging.
- After **deleting or renaming a shared component**, run a repo-wide search for the old name (imports, JSX, dynamic imports) so runtime errors like “X is not defined” do not reach production.

## Auth / marketing layout

- **`SiteMarketingChromeLayout`** — `/login` and `/signup` (and subpaths) have **no utility bar**, **Header** with **Furnishes logo only** (no main nav / Start journey), and **no** site `Footer` (`SiteMarketingFooterGate`). Other `(site)` routes use the full orange strip + footer.

## Smoke checks (when relevant)

- Open `/login` and `/signup` after layout or poster changes.
- Hard-refresh or restart `next dev` if HMR still references a deleted file.
