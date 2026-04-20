"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/site/Footer";
import { isAuthMarketingSplitPath } from "@/lib/site/auth-marketing-paths";

/** Renders `Footer` except on auth split routes (login / signup). */
export function SiteMarketingFooterGate() {
  const pathname = usePathname();
  if (isAuthMarketingSplitPath(pathname)) return null;
  return <Footer />;
}
