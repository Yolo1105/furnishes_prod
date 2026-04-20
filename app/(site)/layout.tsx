import type { ReactNode } from "react";
import { SiteMarketingChromeLayout } from "@/components/site/SiteMarketingChromeLayout";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteMarketingChromeLayout>{children}</SiteMarketingChromeLayout>;
}
