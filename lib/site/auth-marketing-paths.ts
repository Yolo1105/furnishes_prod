/**
 * Login / signup routes under `(site)` — no orange utility bar (`SiteMarketingFixedChrome`),
 * header shows logo link only (`Header`), no site footer (`SiteMarketingFooterGate`).
 */
export function isAuthMarketingSplitPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/signup" || pathname.startsWith("/signup/")) return true;
  return false;
}
