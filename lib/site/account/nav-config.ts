import {
  LayoutDashboard,
  Sparkles,
  ListChecks,
  PiggyBank,
  MessagesSquare,
  BookOpen,
  Heart,
  FolderKanban,
  Image as ImageIcon,
  User,
  Bell,
  ShieldCheck,
  Lock,
  CreditCard,
  Activity,
  LifeBuoy,
  Package,
  Truck,
  RefreshCcw,
} from "lucide-react";

export type NavItem = {
  slug: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey?: string;
  soonPill?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/**
 * Sidebar IA — 5 groups, reorganized post-redesign:
 *   OVERVIEW (1)
 *   IDENTITY (3)
 *   DESIGN (5)
 *   ACCOUNT (7) — now includes Help & Feedback
 *   COMMERCE (3) — reduced from 5; Addresses + Payment moved into Profile sub-tabs
 */
export const ACCOUNT_NAV_GROUPS: readonly NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ slug: "", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "identity",
    label: "Identity",
    items: [
      { slug: "style", label: "Style Profile", icon: Sparkles },
      { slug: "preferences", label: "Preferences", icon: ListChecks },
      { slug: "budget", label: "Budget", icon: PiggyBank },
    ],
  },
  {
    id: "design",
    label: "Design",
    items: [
      {
        slug: "conversations",
        label: "Conversations",
        icon: MessagesSquare,
        countKey: "conversations",
      },
      { slug: "playbooks", label: "Playbooks", icon: BookOpen, soonPill: true },
      {
        slug: "shortlist",
        label: "Shortlist",
        icon: Heart,
        countKey: "shortlist",
      },
      {
        slug: "projects",
        label: "Projects",
        icon: FolderKanban,
        countKey: "projects",
        soonPill: true,
      },
      {
        slug: "uploads",
        label: "Uploads",
        icon: ImageIcon,
        countKey: "uploads",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { slug: "profile", label: "Profile", icon: User },
      { slug: "notifications", label: "Notifications", icon: Bell },
      { slug: "security", label: "Security", icon: ShieldCheck },
      { slug: "privacy", label: "Privacy & Data", icon: Lock },
      { slug: "billing", label: "Billing", icon: CreditCard },
      { slug: "activity", label: "Activity", icon: Activity },
      { slug: "support", label: "Help & Feedback", icon: LifeBuoy },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { slug: "orders", label: "Orders", icon: Package },
      { slug: "deliveries", label: "Deliveries", icon: Truck },
      { slug: "returns", label: "Returns", icon: RefreshCcw },
    ],
  },
] as const;

export function getActiveNavItem(pathname: string): NavItem | null {
  const slug = pathname.replace(/^\/account\/?/, "").split("/")[0] ?? "";
  for (const group of ACCOUNT_NAV_GROUPS) {
    const match = group.items.find((i) => i.slug === slug);
    if (match) return match;
  }
  return null;
}

/**
 * Short line for the sidebar top strip — keyed by first segment under `/account`.
 */
export const ACCOUNT_SIDEBAR_HEADLINE: Record<string, string> = {
  "": "Your overview.",
  style: "Your style.",
  preferences: "Tastes & defaults.",
  budget: "Spend & limits.",
  conversations: "Chats with Eva.",
  playbooks: "Saved guides.",
  shortlist: "Loved pieces.",
  projects: "Rooms in progress.",
  uploads: "Plans & photos.",
  "image-gen": "Image Gen — reference imagery & 3D draft.",
  profile: "Who you are.",
  notifications: "Alerts & emails.",
  security: "Sign-in & access.",
  privacy: "Your data.",
  billing: "Plan & billing.",
  activity: "Recent activity.",
  support: "Help & feedback.",
  orders: "Your orders.",
  deliveries: "Shipments.",
  returns: "Returns & swaps.",
  welcome: "Get started.",
  addresses: "Shipping addresses.",
  payment: "Payment.",
};

/** One short sentence for the sidebar header; updates with the active route. */
export function getAccountSidebarHeadline(pathname: string): string {
  const slug = pathname.replace(/^\/account\/?/, "").split("/")[0] ?? "";
  if (Object.prototype.hasOwnProperty.call(ACCOUNT_SIDEBAR_HEADLINE, slug)) {
    return ACCOUNT_SIDEBAR_HEADLINE[slug]!;
  }
  const item = getActiveNavItem(pathname);
  if (item) return `${item.label}.`;
  if (!slug) return "Studio.";
  const words = slug.replace(/-/g, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
}
