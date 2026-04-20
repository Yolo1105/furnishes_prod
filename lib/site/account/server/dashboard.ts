import "server-only";

import type { SessionCounts } from "@/lib/site/account/shell-counts";
import { prisma } from "@/lib/db/prisma";
import { relativeTime } from "@/lib/site/account/formatters";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import {
  accountDashboardPlanLabel,
  getAccountTokenUsage,
} from "@/lib/site/account/server/usage";

function greetingSGT(): string {
  const fmt = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "numeric",
    hour12: false,
  });
  const h = Number(fmt.format(new Date()));
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export type AccountDashboardData = {
  firstName: string;
  greeting: string;
  counts: {
    conversations: number;
    shortlist: number;
    projects: number;
    uploads: number;
  };
  styleProfile: {
    name?: string;
    tagline?: string;
    palette?: string[];
    hasTaken: boolean;
  };
  usage: { used: number; limit: number; plan: "FREE" | "PRO" | "STUDIO+" };
  hasBudget: boolean;
  budgetLabel?: string;
  lastActivityLabel?: string;
};

export async function getAccountDashboard(
  userId: string,
  /** From `resolveSession().counts` — avoids a second round of count queries. */
  precomputedCounts?: SessionCounts,
): Promise<AccountDashboardData> {
  const countQueries =
    precomputedCounts === undefined
      ? Promise.all([
          prisma.conversation.count({ where: { userId } }),
          prisma.shortlistItem.count({ where: { userId } }),
          prisma.project.count({
            where: { userId, NOT: { status: "archived" } },
          }),
          prisma.upload.count({ where: { userId } }),
        ])
      : Promise.resolve([
          precomputedCounts.conversations,
          precomputedCounts.shortlist,
          precomputedCounts.projects,
          precomputedCounts.uploads,
        ]);

  const [
    user,
    [conversationCount, shortlistCount, projectCount, uploadCount],
    styleRow,
    budgetRow,
    lastEvent,
    tokenUsage,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    countQueries,
    prisma.styleProfileRecord.findUnique({ where: { userId } }),
    prisma.budget.findUnique({
      where: { userId },
      select: { minCents: true, maxCents: true, currency: true },
    }),
    prisma.activityEvent.findFirst({
      where: { userId },
      orderBy: { at: "desc" },
    }),
    getAccountTokenUsage(userId),
  ]);

  const displayName =
    user?.name?.trim() || user?.email?.split("@")[0]?.trim() || "there";
  const firstName = displayName.split(/\s+/)[0] ?? displayName;

  let budgetLabel: string | undefined;
  let hasBudget = false;
  if (budgetRow && budgetRow.maxCents > 0) {
    hasBudget = true;
    const cur = budgetRow.currency as string;
    budgetLabel = `${formatMoneyCentsLoose(budgetRow.minCents, cur)} – ${formatMoneyCentsLoose(budgetRow.maxCents, cur)}`;
  }

  let lastActivityLabel: string | undefined;
  if (lastEvent) {
    lastActivityLabel = `${lastEvent.label} ${relativeTime(lastEvent.at)}`;
  }

  const hasStyle = !!styleRow;

  return {
    firstName,
    greeting: greetingSGT(),
    counts: {
      conversations: conversationCount,
      shortlist: shortlistCount,
      projects: projectCount,
      uploads: uploadCount,
    },
    styleProfile: {
      name: styleRow?.name,
      tagline: styleRow?.tagline,
      palette: styleRow?.palette,
      hasTaken: hasStyle,
    },
    usage: {
      used: tokenUsage.used,
      limit: tokenUsage.limit,
      plan: accountDashboardPlanLabel(),
    },
    hasBudget,
    budgetLabel,
    lastActivityLabel,
  };
}
