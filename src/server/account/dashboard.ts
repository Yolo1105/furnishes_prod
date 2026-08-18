import { getBudget } from "@/server/account/budget";
import { getFullStyleProfile } from "@/server/account/style-profile";
import { listConversations } from "@/server/conversations/service";
import { listInspirationItems } from "@/server/inspiration/inspiration-service";
import { listProjects } from "@/server/projects/service";
import { listUploads } from "@/server/uploads/service";

export type AccountDashboardModel = {
  styleLabel: string;
  styleSummary: string;
  styleColors: string[];
  projectsInProgress: number;
  budgetUsedPercent: number | null;
  budgetSpentLabel: string;
  budgetMaxLabel: string;
  conversationCount: number;
  conversationPreview: string;
  shortlistCount: number;
  shortlistPreview: string;
  projectCount: number;
  projectPreview: string;
  uploadCount: number;
  uploadPreview: string;
  recentActivity: Array<{
    title: string;
    detail: string;
    when: string;
    at: string;
  }>;
};

function formatMoney(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  if (currency === "SGD") return `S$${amount.toLocaleString("en-SG")}`;
  return `${currency} ${amount.toLocaleString("en-SG")}`;
}

function relativeWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (ms < hour) return `${Math.max(1, Math.round(ms / (60 * 1000)))}m`;
  if (ms < day) return `${Math.round(ms / hour)}h`;
  if (ms < 7 * day) return `${Math.round(ms / day)}d`;
  return `${Math.round(ms / (7 * day))}w`;
}

/**
 * Aggregates existing Account domain reads for the dashboard surface.
 * Commerce metrics stay out of scope (no order models).
 */
export async function getAccountDashboard(
  userId: string,
): Promise<AccountDashboardModel> {
  const [style, budget, conversations, inspiration, projects, uploads] =
    await Promise.all([
      getFullStyleProfile(userId),
      getBudget(userId),
      listConversations(userId),
      listInspirationItems(userId),
      listProjects(userId),
      listUploads(userId),
    ]);

  const conversationItems = conversations.items;
  const activeProjects = projects.filter(
    (project) => project.status.toLowerCase() !== "archived",
  );
  const spent =
    budget.allocations.length > 0
      ? budget.allocations.reduce((sum, row) => sum + row.amount, 0)
      : null;
  const budgetUsedPercent =
    spent != null && budget.maximum != null && budget.maximum > 0
      ? Math.min(100, Math.round((spent / budget.maximum) * 100))
      : null;

  const latestConversation = conversationItems[0];
  const latestInspiration = inspiration.items[0];
  const latestProject = activeProjects[0] ?? projects[0];
  const latestUpload = uploads[0];

  const latestTitle = latestConversation?.title?.trim() || "";
  const conversationPreview =
    latestTitle && latestTitle !== "New conversation"
      ? latestTitle
      : conversationItems.length > 0
        ? "Continue your latest thread"
        : "Oak console options for the entryway";

  return {
    styleLabel: style.heroLabel,
    styleSummary: style.heroSummary,
    styleColors: ["#DDD5C4", "#B09470", "#8C6B4F", "#5E4B3A", "#D9C9A3"],
    projectsInProgress: activeProjects.length,
    budgetUsedPercent,
    budgetSpentLabel: formatMoney(spent, budget.currency),
    budgetMaxLabel: formatMoney(budget.maximum, budget.currency),
    conversationCount: conversationItems.length,
    conversationPreview,
    shortlistCount: inspiration.items.length,
    shortlistPreview:
      latestInspiration?.title?.trim() ||
      latestInspiration?.note?.trim() ||
      "Söderhamn 3-seat sofa · S$1,299",
    projectCount: activeProjects.length,
    projectPreview:
      latestProject?.name?.trim() || "Living room refresh · 80% sourced",
    uploadCount: uploads.length,
    uploadPreview:
      latestUpload?.filename?.trim() || "Living room, north wall · analyzed",
    recentActivity: [
      ...conversationItems.slice(0, 3).map((item) => ({
        title: item.title?.trim() || "Conversation updated",
        detail: "Chat with Eva",
        when: relativeWhen(item.updatedAt),
        at: item.updatedAt,
      })),
      ...activeProjects.slice(0, 2).map((item) => ({
        title: `Project “${item.name}”`,
        detail: item.summary?.trim() || item.status,
        when: relativeWhen(item.updatedAt),
        at: item.updatedAt,
      })),
      ...inspiration.items.slice(0, 2).map((item) => ({
        title: item.title?.trim() || "Saved to shortlist",
        detail: item.projectName?.trim() || "Inspiration Board",
        when: relativeWhen(item.updatedAt),
        at: item.updatedAt,
      })),
      ...uploads.slice(0, 2).map((item) => ({
        title: item.filename,
        detail: item.projectName?.trim() || "Uploads",
        when: relativeWhen(item.createdAt),
        at: item.createdAt,
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 6),
  };
}
