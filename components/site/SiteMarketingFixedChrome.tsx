"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/site/Header";
import { SiteChrome } from "@/components/site/SiteChrome";
import { UtilityBar } from "@/components/site/UtilityBar";
import { useWorkspaceRailHover } from "@/components/shared/layout/sidebar/workspace-rail-hover";
import { isAuthMarketingSplitPath } from "@/lib/site/auth-marketing-paths";
import { LANDING_SECTION_IDS } from "@/content/site/landing-sections";
import { useSidebarOptional } from "@/components/shared/layout/sidebar";

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
  const hover = useWorkspaceRailHover();
  const sidebarOptional = useSidebarOptional();
  /** Workspace drawer is z-index 100; lift fixed chrome above it so cart/profile stay visible. */
  const chromeAbovePanel =
    sidebarOptional?.panelOpen || sidebarOptional?.panelClosing
      ? "z-[110]"
      : undefined;

  return (
    <SiteChrome className={chromeAbovePanel}>
      <div
        className="flex w-full flex-col"
        onMouseEnter={hover.onChromeDockEnter}
        onMouseLeave={(e) => hover.onChromeDockLeave(e)}
      >
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
