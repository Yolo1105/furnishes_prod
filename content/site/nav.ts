import {
  STUDIO_PLAYGROUND_PATH_PREFIX,
  isStudioPlaygroundPathname,
} from "@/lib/routes/studio-playground-path";

export const SITE_TITLE_LINES = ["FURNISHES [ INTERIOR REVOLUTION ]"] as const;

export const CTA_NAV_LABEL = "START JOURNEY";

export type HeaderActiveLink =
  | "about"
  | "collections"
  | "inspiration"
  | "playground"
  | "studio"
  | null;

export type NavItem = {
  name: string;
  href: string;
  activeKey: HeaderActiveLink;
  badge?: string;
};

/** Which main-nav item is active for the current path (marketing + Studio shell). */
export function getMarketingNavActiveKey(
  pathname: string | null | undefined,
): HeaderActiveLink {
  if (!pathname) return null;
  if (pathname === "/about") return "about";
  if (pathname === "/collections" || pathname.startsWith("/collections/"))
    return "collections";
  if (pathname === "/inspiration" || pathname.startsWith("/inspiration/"))
    return "inspiration";
  if (isStudioPlaygroundPathname(pathname)) return "playground";
  if (pathname === "/account" || pathname.startsWith("/account/"))
    return "studio";
  return null;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: "Collections",
    href: "/collections",
    activeKey: "collections",
    badge: "[03]",
  },
  {
    name: "Inspiration",
    href: "/inspiration",
    activeKey: "inspiration",
    badge: "[04]",
  },
  {
    name: "Playground",
    href: STUDIO_PLAYGROUND_PATH_PREFIX,
    activeKey: "playground",
    badge: "[05]",
  },
  { name: "Studio", href: "/account", activeKey: "studio", badge: "[02]" },
  { name: "About", href: "/about", activeKey: "about", badge: "[01]" },
];
