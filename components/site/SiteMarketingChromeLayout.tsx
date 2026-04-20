import type { ReactNode } from "react";
import { SiteMarketingChromeBody } from "@/components/site/site-marketing-chrome-body";

/**
 * Shared marketing shell for `(site)` routes. Login / signup omit the footer
 * (`SiteMarketingFooterGate`); other pages get the global footer.
 *
 * Signed-in users on eligible routes get the Furnishes workspace rail (Eva panels)
 * from the Telegram package design system.
 */
export function SiteMarketingChromeLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SiteMarketingChromeBody>{children}</SiteMarketingChromeBody>;
}
