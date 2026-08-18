import { prisma } from "@/server/db";
import { ok, type ServiceResult } from "@/server/result";
import { assertRowQuota, maxHelpRequestsPerDay } from "@/server/quota";

export async function getNotificationPrefs(userId: string): Promise<{
  emailSecurity: boolean;
  emailDigest: boolean;
  inAppUpdates: boolean;
}> {
  const prefs = await prisma.notificationPrefs.findUnique({
    where: { userId },
  });
  if (!prefs) {
    return {
      emailSecurity: true,
      emailDigest: true,
      inAppUpdates: true,
    };
  }
  return {
    emailSecurity: prefs.emailSecurity,
    emailDigest: prefs.emailDigest,
    inAppUpdates: prefs.inAppUpdates,
  };
}

export async function updateNotificationPrefs(
  userId: string,
  input: {
    emailSecurity?: boolean;
    emailDigest?: boolean;
    inAppUpdates?: boolean;
  },
): Promise<
  ServiceResult<
    {
      emailSecurity: boolean;
      emailDigest: boolean;
      inAppUpdates: boolean;
    },
    never
  >
> {
  const prefs = await prisma.notificationPrefs.upsert({
    where: { userId },
    create: {
      userId,
      emailSecurity: input.emailSecurity ?? true,
      emailDigest: input.emailDigest ?? true,
      inAppUpdates: input.inAppUpdates ?? true,
      emailUpdates: false,
    },
    update: {
      ...(input.emailSecurity !== undefined
        ? { emailSecurity: input.emailSecurity }
        : {}),
      ...(input.emailDigest !== undefined
        ? { emailDigest: input.emailDigest }
        : {}),
      ...(input.inAppUpdates !== undefined
        ? { inAppUpdates: input.inAppUpdates }
        : {}),
      emailUpdates: false,
    },
  });

  return ok({
    emailSecurity: prefs.emailSecurity,
    emailDigest: prefs.emailDigest,
    inAppUpdates: prefs.inAppUpdates,
  });
}

export async function createHelpRequest(
  userId: string,
  input: { category: string; message: string; context?: string },
): Promise<ServiceResult<{ id: string }, "rate_limited">> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const quota = await assertRowQuota(
    () =>
      prisma.helpRequest.count({
        where: { userId, createdAt: { gte: dayStart } },
      }),
    maxHelpRequestsPerDay(),
    "help requests today",
  );
  if (!quota.ok) return quota;
  const help = await prisma.helpRequest.create({
    data: {
      userId,
      category: input.category.trim().slice(0, 80) || "general",
      message: input.message.trim().slice(0, 4000),
      context: input.context?.trim().slice(0, 200) || null,
    },
  });
  return ok({ id: help.id });
}
