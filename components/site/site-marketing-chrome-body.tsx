"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SiteMarketingFixedChrome } from "@/components/site/SiteMarketingFixedChrome";
import { SiteMarketingFooterGate } from "@/components/site/SiteMarketingFooterGate";
import { MainWithSidebarMargin } from "@/components/site/main-with-sidebar-margin";
import { SiteChromeScrollSentinel } from "@/components/site/SiteChrome";
import { WorkspaceRailGateProvider } from "@/components/site/workspace-rail-gate";
import type { MarketingHeaderContext } from "@/lib/auth/marketing-header-context.types";
import { isMarketingWorkspaceRailEnabled } from "@/lib/site/marketing-workspace-rail";
import { CartProvider } from "@/contexts/CartContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import {
  SidebarProvider,
  RightSidebar as FurnishesWorkspaceSidebar,
} from "@/components/shared/layout/sidebar";
import { ContentWrapper } from "@/components/shared/layout/ContentWrapper";

export function SiteMarketingChromeBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [headerCtx, setHeaderCtx] = useState<MarketingHeaderContext | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/header-context", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: MarketingHeaderContext) => {
        if (!cancelled) setHeaderCtx(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHeaderCtx({
            signedIn: false,
            displayName: null,
            cartCount: 0,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const railAllowed = isMarketingWorkspaceRailEnabled(pathname);
  const enabled = headerCtx?.signedIn === true && railAllowed;

  const main = (
    <MainWithSidebarMargin>
      <SiteChromeScrollSentinel />
      {children}
    </MainWithSidebarMargin>
  );

  const chrome = (
    <>
      <SiteMarketingFixedChrome />
      {enabled ? (
        <ContentWrapper sidebar={<FurnishesWorkspaceSidebar />}>
          {main}
        </ContentWrapper>
      ) : (
        main
      )}
      <SiteMarketingFooterGate />
    </>
  );

  return (
    <WorkspaceRailGateProvider enabled={enabled}>
      {enabled ? (
        <CartProvider>
          <ProjectProvider>
            <SidebarProvider>{chrome}</SidebarProvider>
          </ProjectProvider>
        </CartProvider>
      ) : (
        chrome
      )}
    </WorkspaceRailGateProvider>
  );
}
