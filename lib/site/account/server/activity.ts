import "server-only";

import type { ActivityCategory as PrismaActivityCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActivityCategory, ActivityEvent } from "@/lib/site/account/types";

function mapCategory(c: PrismaActivityCategory): ActivityCategory {
  const m: Record<PrismaActivityCategory, ActivityCategory> = {
    sign_in: "sign-in",
    profile: "profile",
    preferences: "preferences",
    project: "project",
    upload: "upload",
    conversation: "conversation",
    security: "security",
    billing: "billing",
    shortlist: "shortlist",
  };
  return m[c];
}

export async function getAccountActivity(
  userId: string,
  take = 40,
): Promise<ActivityEvent[]> {
  const rows = await prisma.activityEvent.findMany({
    where: { userId },
    orderBy: { at: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    category: mapCategory(r.category),
    label: r.label,
    description: r.description ?? undefined,
    at: r.at.toISOString(),
    href: r.href ?? undefined,
  }));
}
