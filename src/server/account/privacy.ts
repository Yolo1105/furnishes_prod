import { prisma } from "@/server/db";
import { ok, type ServiceResult } from "@/server/result";

export async function getMemoryEnabled(userId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { memoryEnabled: true },
  });
  return user.memoryEnabled;
}

export async function setMemoryEnabled(
  userId: string,
  enabled: boolean,
): Promise<ServiceResult<{ memoryEnabled: boolean }, never>> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { memoryEnabled: enabled },
    select: { memoryEnabled: true },
  });
  return ok({ memoryEnabled: user.memoryEnabled });
}

export async function exportAccountData(userId: string): Promise<{
  exportedAt: string;
  user: unknown;
  styleProfile: unknown;
  budget: unknown;
  projects: unknown;
  conversations: unknown;
  uploads: unknown;
  evaPreferences: unknown;
  preferenceProposals: unknown;
  messageFeedback: unknown;
}> {
  const [
    user,
    styleProfile,
    budget,
    projects,
    conversations,
    uploads,
    evaPreferences,
    preferenceProposals,
    messageFeedback,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerifiedAt: true,
        memoryEnabled: true,
        activeAssistantId: true,
        createdAt: true,
      },
    }),
    prisma.styleProfile.findUnique({ where: { userId } }),
    prisma.budget.findUnique({ where: { userId } }),
    prisma.project.findMany({ where: { ownerId: userId } }),
    prisma.conversation.findMany({
      where: { userId },
      include: { messages: true, chatGenerations: true },
    }),
    prisma.upload.findMany({ where: { userId } }),
    prisma.userPreference.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.preferenceProposal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.messageFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    styleProfile,
    budget,
    projects,
    conversations,
    uploads,
    evaPreferences,
    preferenceProposals,
    messageFeedback,
  };
}

export async function clearStudioMemory(
  userId: string,
): Promise<ServiceResult<{ cleared: true }, never>> {
  await prisma.$transaction([
    prisma.preferenceProposal.deleteMany({ where: { userId } }),
    prisma.userPreference.deleteMany({ where: { userId } }),
    prisma.styleProfile.upsert({
      where: { userId },
      create: { userId, displayName: null, styleWords: null },
      update: { displayName: null, styleWords: null, preferencesJson: null },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { displayName: null },
    }),
    prisma.securityEvent.create({
      data: { userId, kind: "memory_cleared" },
    }),
  ]);
  return ok({ cleared: true });
}

export async function exportConversationsOnly(userId: string): Promise<{
  exportedAt: string;
  conversations: unknown;
}> {
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return {
    exportedAt: new Date().toISOString(),
    conversations,
  };
}

/**
 * Soft-delete the account: wipe personal content, anonymize the user row.
 *
 * The User row is updated (not hard-deleted) so login cannot reuse the email
 * and referential integrity for audit rows stays intact. Because cascades on
 * `userId` only fire on hard delete, every personal table must be cleared
 * explicitly here.
 *
 * **Retained on purpose:** `CostLog` (spend ledger — no message content),
 * `SecurityEvent` (audit trail), and `Order` / `OrderItem` (SG 5-year
 * transaction records; shipping PII is anonymized in place). Documented in
 * `docs/ACCOUNT_HARDENING.md`.
 */
export async function deleteAccount(
  userId: string,
): Promise<ServiceResult<{ deleted: true }, never>> {
  await prisma.$transaction(
    async (tx) => {
      // Preferences / feedback first (FKs into messages + conversations).
      await tx.preferenceProposal.deleteMany({ where: { userId } });
      await tx.userPreference.deleteMany({ where: { userId } });
      await tx.messageFeedback.deleteMany({ where: { userId } });
      await tx.implicitSignal.deleteMany({ where: { userId } });

      // Conversations cascade messages, shares, recommendations, generations, etc.
      await tx.conversation.deleteMany({ where: { userId } });

      // User-owned content that does NOT cascade from soft-delete.
      await Promise.all([
        tx.roomPlan.deleteMany({ where: { userId } }),
        tx.inspirationItem.deleteMany({ where: { userId } }),
        tx.furnitureStudioPiece.deleteMany({ where: { userId } }),
        tx.imageGeneration.deleteMany({ where: { userId } }),
        tx.upload.deleteMany({ where: { userId } }),
        tx.address.deleteMany({ where: { userId } }),
        tx.cart.deleteMany({ where: { userId } }),
      ]);

      await tx.projectMember.deleteMany({ where: { userId } });
      await tx.projectComment.deleteMany({ where: { userId } });
      await tx.projectApproval.deleteMany({ where: { userId } });
      await tx.project.deleteMany({ where: { ownerId: userId } });

      await tx.styleProfile.deleteMany({ where: { userId } });
      await tx.budget.deleteMany({ where: { userId } });
      await tx.notificationPrefs.deleteMany({ where: { userId } });
      await tx.emailToken.deleteMany({ where: { userId } });
      await tx.helpRequest.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });

      // CostLog / SecurityEvent retained. Orders kept for statutory records;
      // strip shipping PII so the snapshot is not a live address book.
      await tx.order.updateMany({
        where: { userId },
        data: {
          shipRecipient: "deleted",
          shipLine1: "deleted",
          shipLine2: null,
          shipCity: null,
          shipPostalCode: "deleted",
          shipPhone: null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted+${userId}@invalid.local`,
          passwordHash: "deleted",
          displayName: null,
          memoryEnabled: false,
          activeAssistantId: "eva-general",
        },
      });
      await tx.securityEvent.create({
        data: { userId, kind: "account_deleted" },
      });
    },
    { timeout: 30_000, maxWait: 10_000 },
  );
  return ok({ deleted: true });
}
