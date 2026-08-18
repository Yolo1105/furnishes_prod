/**
 * Authoritative Account view ↔ URL map for the React shell (rail active state,
 * titles, and Links). Keep labels/routes identical to the approved Account UI.
 */

const ACCOUNT_VIEW_PATHS = {
  dashboard: "/account",
  activity: "/account/activity",
  style: "/account/style",
  budget: "/account/budget",
  privacy: "/account/privacy",
  conversations: "/account/conversations",
  chat: "/account/chat",
  canvas: "/account/canvas",
  shortlist: "/account/shortlist",
  projects: "/account/projects",
  quiz: "/account/quiz",
  uploads: "/account/uploads",
  imagegen: "/account/image-generation",
  orders: "/account/orders",
  billing: "/account/billing",
  settings: "/account/settings",
  help: "/account/help",
  cart: "/account/cart",
  checkout: "/account/checkout",
} as const;

type AccountStudioView = keyof typeof ACCOUNT_VIEW_PATHS;

const PATH_TO_VIEW: Array<{ prefix: string; view: AccountStudioView }> = [
  { prefix: "/account/image-generation", view: "imagegen" },
  { prefix: "/account/chat", view: "chat" },
  { prefix: "/account/canvas", view: "canvas" },
  { prefix: "/account/conversations", view: "conversations" },
  { prefix: "/account/style", view: "style" },
  { prefix: "/account/budget", view: "budget" },
  { prefix: "/account/privacy", view: "privacy" },
  { prefix: "/account/shortlist", view: "shortlist" },
  { prefix: "/account/inspiration", view: "shortlist" },
  { prefix: "/account/projects", view: "projects" },
  { prefix: "/account/quiz", view: "quiz" },
  { prefix: "/account/uploads", view: "uploads" },
  { prefix: "/account/orders", view: "orders" },
  { prefix: "/account/billing", view: "billing" },
  { prefix: "/account/settings", view: "settings" },
  { prefix: "/account/help", view: "help" },
  { prefix: "/account/cart", view: "cart" },
  { prefix: "/account/checkout", view: "checkout" },
  { prefix: "/account/activity", view: "activity" },
];

export function viewFromAccountPath(pathname: string): AccountStudioView {
  for (const row of PATH_TO_VIEW) {
    if (pathname === row.prefix || pathname.startsWith(`${row.prefix}/`)) {
      return row.view;
    }
  }
  return "dashboard";
}

export function pathForAccountView(view: string): string {
  if (view in ACCOUNT_VIEW_PATHS) {
    return ACCOUNT_VIEW_PATHS[view as AccountStudioView];
  }
  return "/account";
}
