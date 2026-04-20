import type { ReactNode } from "react";

/**
 * Auth routes (login, signup, forgot, reset, verify). See `SiteMarketingChromeLayout`
 * — no utility bar + logo-only header on login/signup; no site footer there.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
