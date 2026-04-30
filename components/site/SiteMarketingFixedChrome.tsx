"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/site/Header";
import { SiteChrome } from "@/components/site/SiteChrome";
import { UtilityBar } from "@/components/site/UtilityBar";
/* Will be used somewhere else later: workspace rail hover dock + z-index above drawer. */
// import { useWorkspaceRailHover } from "@/components/shared/layout/sidebar/workspace-rail-hover";
import { isAuthMarketingSplitPath } from "@/lib/site/auth-marketing-paths";
import { LANDING_SECTION_IDS } from "@/content/site/landing-sections";
// import { useSidebarOptional } from "@/components/shared/layout/sidebar";

/**
 * Fixed top chrome for `(site)`: login/signup omit the orange utility strip;
 * all routes get `Header` (logo-only on auth — see `Header`).
 *
 * When the workspace sidebar is active, the utility bar + header form one hover
 * “dock” with the rail so moving between them does not collapse the rail.
 */
export function SiteMarketingFixedChrome() {
  const pathname = usePathname();
  const hideUtilityBar = isAuthMarketingSplitPath(pathname);
  // Will be used somewhere else later (workspace rail):
  // const hover = useWorkspaceRailHover();
  // const sidebarOptional = useSidebarOptional();
  // const chromeAbovePanel =
  //   sidebarOptional?.panelOpen || sidebarOptional?.panelClosing
  //     ? "z-[110]"
  //     : undefined;

  return (
    <SiteChrome>
      <div className="flex w-full flex-col">
        {!hideUtilityBar && <UtilityBar />}
        <Header
          variant="fixed"
          theme="light"
          firstSectionId={LANDING_SECTION_IDS[0]}
        />
      </div>
    </SiteChrome>
  );
}
