type NavItem = { label: string; href: string };
type NavGroup = { label: string; items: NavItem[] };

export const accountNavigationGroups: NavGroup[] = [
  {
    label: "Design Work",
    items: [
      { label: "Projects", href: "/account/projects" },
      { label: "Explore", href: "/account/inspiration" },
      { label: "Quiz", href: "/account/quiz" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "History", href: "/account/activity" },
      { label: "Orders", href: "/account/orders" },
      { label: "Billing", href: "/account/billing" },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Profile", href: "/account/settings" },
      { label: "Memory & data", href: "/account/privacy" },
      { label: "Customer Service", href: "/account/help" },
    ],
  },
];

/** Commerce entries, hidden entirely while COMMERCE_ENABLED is off. */
const COMMERCE_ITEMS: NavItem[] = [
  { label: "Collections", href: "/account/collections" },
  { label: "Cart", href: "/account/cart" },
];

const COMMERCE_HREFS = new Set([
  ...COMMERCE_ITEMS.map((item) => item.href),
  "/account/orders",
  "/account/billing",
  "/account/checkout",
]);

/**
 * Navigation for the current commerce state.
 *
 * With commerce off, buying surfaces are removed rather than shown inert: a
 * checkout that looks finished but cannot charge is worse than no checkout,
 * because a shopper reasonably believes they have ordered.
 */
export function accountNavigationFor(commerceEnabled: boolean): NavGroup[] {
  if (commerceEnabled) {
    return accountNavigationGroups.map((group) =>
      group.label === "Account"
        ? { ...group, items: [...COMMERCE_ITEMS, ...group.items] }
        : group,
    );
  }
  return accountNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !COMMERCE_HREFS.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Top Workspace modes:
 * [01] Dashboard → account home (and all non-chat / non-canvas views)
 * [02] Chat → chat workspace (latest thread, or a new one)
 * [03] Canvas → 3D room visualizer
 */
export const accountWorkspaceModes = [
  {
    label: "Dashboard",
    href: "/account",
    index: "01",
  },
  {
    label: "Chat",
    href: "/account/chat",
    index: "02",
  },
  {
    label: "Canvas",
    href: "/account/canvas",
    index: "03",
  },
] as const;

const ACCOUNT_TAGLINES = {
  dashboard: "A design studio where rooms move off-template",
  chat: "Every room starts as a conversation",
  canvas: "Move the room before you move a thing",
} as const;

export function isAccountNavActive(pathname: string, href: string): boolean {
  if (href === "/account") {
    return pathname === "/account";
  }
  if (href === "/account/inspiration") {
    return (
      pathname === "/account/inspiration" ||
      pathname.startsWith("/account/inspiration/") ||
      pathname === "/account/shortlist" ||
      pathname.startsWith("/account/shortlist/")
    );
  }
  const base = href.split("?")[0] ?? href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Dashboard [01] stays lit for every non-chat / non-canvas view. */
export function isAccountModeActive(pathname: string, href: string): boolean {
  if (href === "/account") {
    return !isChatPath(pathname) && !isCanvasPath(pathname);
  }
  if (href === "/account/chat") {
    return isChatPath(pathname);
  }
  if (href === "/account/canvas") {
    return isCanvasPath(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function accountPageTitle(pathname: string): string {
  for (const group of accountNavigationGroups) {
    for (const item of group.items) {
      if (isAccountNavActive(pathname, item.href)) {
        return item.label;
      }
    }
  }
  if (pathname === "/account") return "Dashboard";
  if (
    pathname === "/account/canvas" ||
    pathname.startsWith("/account/canvas/")
  ) {
    return "Canvas";
  }
  if (
    pathname === "/account/conversations" ||
    pathname.startsWith("/account/conversations/")
  ) {
    return "Conversations";
  }
  if (pathname === "/account/activity") return "History";
  if (pathname === "/account/style" || pathname.startsWith("/account/style/")) {
    return "Style Profile";
  }
  if (
    pathname === "/account/budget" ||
    pathname.startsWith("/account/budget/")
  ) {
    return "Budget";
  }
  if (
    pathname === "/account/privacy" ||
    pathname.startsWith("/account/privacy/")
  ) {
    return "Eva’s Memory & Data";
  }
  if (
    pathname === "/account/shortlist" ||
    pathname.startsWith("/account/shortlist/") ||
    pathname === "/account/inspiration" ||
    pathname.startsWith("/account/inspiration/")
  ) {
    return "Explore";
  }
  if (
    pathname === "/account/uploads" ||
    pathname.startsWith("/account/uploads/")
  ) {
    return "Uploads";
  }
  if (pathname === "/account/cart" || pathname.startsWith("/account/cart/")) {
    return "Cart";
  }
  if (
    pathname === "/account/checkout" ||
    pathname.startsWith("/account/checkout/")
  ) {
    return "Checkout";
  }
  if (
    pathname === "/account/image-generation" ||
    pathname.startsWith("/account/image-generation/")
  ) {
    return "Image Generation";
  }
  return "Account";
}

/** Chat workspace (Eva thread) — not the Design Work conversations list. */
export function isChatPath(pathname: string): boolean {
  return (
    pathname === "/account/chat" ||
    (pathname.startsWith("/account/conversations/") &&
      pathname !== "/account/conversations")
  );
}

/** Conversation detail / chat workspace — React chat rail + ChatPage. */
export function isConversationWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/account/conversations/") &&
    pathname !== "/account/conversations"
  );
}

export function isCanvasPath(pathname: string): boolean {
  return (
    pathname === "/account/canvas" || pathname.startsWith("/account/canvas/")
  );
}

export function accountTagline(pathname: string): string {
  if (isChatPath(pathname)) return ACCOUNT_TAGLINES.chat;
  if (isCanvasPath(pathname)) return ACCOUNT_TAGLINES.canvas;
  return ACCOUNT_TAGLINES.dashboard;
}
