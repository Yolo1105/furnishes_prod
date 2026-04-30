import "server-only";

import type { SessionCounts } from "@/lib/site/account/shell-counts";
import { prisma } from "@/lib/db/prisma";
import { serverLog } from "@/lib/server/server-log";
import { relativeTime } from "@/lib/site/account/formatters";
import { formatMoneyCentsLoose } from "@/lib/site/money";
import {
  accountDashboardPlanLabel,
  evaTokenDisplayLimit,
  getAccountTokenUsage,
} from "@/lib/site/account/server/usage";

/** Passed when DB queries fail so the hub can still show the signed-in name from the session. */
export type AccountDashboardSessionHints = {
  name: string;
  email: string;
};

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

function firstNameFromHints(hints: AccountDashboardSessionHints): string {
  const display =
    hints.name?.trim() || hints.email?.split("@")[0]?.trim() || "there";
  return display.split(/\s+/)[0] ?? display;
}

function degradedDashboard(
  precomputedCounts: SessionCounts | undefined,
  hints: AccountDashboardSessionHints,
): AccountDashboardData {
  const c = precomputedCounts ?? {
    conversations: 0,
    shortlist: 0,
    projects: 0,
    uploads: 0,
  };

  return {
    firstName: firstNameFromHints(hints),
    greeting: greetingSGT(),
    counts: {
      conversations: c.conversations,
      shortlist: c.shortlist,
      projects: c.projects,
      uploads: c.uploads,
    },
    styleProfile: {
      hasTaken: false,
    },
    usage: {
      used: 0,
      limit: evaTokenDisplayLimit(),
      plan: accountDashboardPlanLabel(),
    },
    hasBudget: false,
    budgetLabel: undefined,
    lastActivityLabel: undefined,
  };
}

export async function getAccountDashboard(
  userId: string,
  /** From `resolveSession().counts` — avoids a second round of count queries. */
  precomputedCounts?: SessionCounts,
  /** Used when Prisma fails so the greeting still matches the session (same idea as `resolve_session_db_degraded`). */
  sessionHints?: AccountDashboardSessionHints,
): Promise<AccountDashboardData> {
  try {
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
  } catch (e) {
    serverLog("warn", "account_dashboard_db_degraded", {
      error: e instanceof Error ? e.message : String(e),
    });
    const hints: AccountDashboardSessionHints = sessionHints ?? {
      name: "",
      email: "",
    };
    return degradedDashboard(precomputedCounts, hints);
  }
}
