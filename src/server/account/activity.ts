import { getAccountDashboard } from "@/server/account/dashboard";

type ActivityItemModel = {
  title: string;
  detail: string;
  when: string;
  kind: "Eva" | "Orders" | "Projects" | "Other";
};

/**
 * Activity feed from real Account domains (no commerce/order events yet).
 */
export async function listAccountActivity(
  userId: string,
): Promise<ActivityItemModel[]> {
  const dashboard = await getAccountDashboard(userId);
  return dashboard.recentActivity.map((item) => {
    const lower = `${item.title} ${item.detail}`.toLowerCase();
    let kind: ActivityItemModel["kind"] = "Other";
    if (lower.includes("chat") || lower.includes("conversation")) {
      kind = "Eva";
    } else if (lower.includes("project")) {
      kind = "Projects";
    }
    return {
      title: item.title,
      detail: item.detail,
      when: item.when,
      kind,
    };
  });
}
