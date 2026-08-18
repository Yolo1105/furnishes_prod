import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/crypto";
import { deleteAccount } from "./privacy";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("deleteAccount personal-data wipe", () => {
  beforeAll(() => {
    process.env.CHAT_PROVIDER = "local";
  });

  it("wipes every personal table while retaining CostLog and soft-deleting User", async () => {
    const passwordHash = await hashPassword("delete-me-please-12");
    const user = await prisma.user.create({
      data: {
        email: `delete-wipe-${Date.now()}@example.com`,
        passwordHash,
        displayName: "Wipe Target",
        emailVerifiedAt: new Date(),
      },
    });
    const userId = user.id;

    const project = await prisma.project.create({
      data: {
        ownerId: userId,
        name: "Wipe project",
        status: "planning",
      },
    });

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        projectId: project.id,
        title: "Wipe conversation",
        status: "active",
      },
    });

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: "personal note that must not survive",
        status: "complete",
        clientMessageId: crypto.randomUUID(),
      },
    });

    await prisma.userPreference.create({
      data: {
        userId,
        category: "style",
        value: "japandi",
        source: "manual",
      },
    });

    await prisma.preferenceProposal.create({
      data: {
        userId,
        conversationId: conversation.id,
        sourceMessageId: userMessage.id,
        category: "budget",
        proposedValue: "under-5k",
        confidence: 0.9,
        status: "pending",
      },
    });

    await prisma.messageFeedback.create({
      data: {
        messageId: userMessage.id,
        userId,
        rating: "up",
      },
    });

    await prisma.implicitSignal.create({
      data: {
        userId,
        conversationId: conversation.id,
        type: "restate_preference",
        category: "style",
      },
    });

    await prisma.sharedProject.create({
      data: {
        conversationId: conversation.id,
        shareId: `wipe${Date.now().toString(36)}`.slice(0, 12),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await prisma.designRecommendation.create({
      data: {
        conversationId: conversation.id,
        stableId: "wipe-rec-1",
        payload: { label: "sofa" },
        rank: 1,
      },
    });

    const roomPlan = await prisma.roomPlan.create({
      data: {
        userId,
        projectId: project.id,
        name: "Wipe living room",
        budgetCapCents: 500_000,
        currency: "USD",
        items: {
          create: {
            label: "personal sofa note",
            category: "sofa",
            priority: "core",
            status: "needed",
            notes: "must be deleted",
            sortOrder: 0,
          },
        },
      },
    });

    const upload = await prisma.upload.create({
      data: {
        userId,
        projectId: project.id,
        filename: "wipe.png",
        mimeType: "image/png",
        sizeBytes: 12,
        status: "ready",
        source: "user_upload",
        storageKey: `${userId}/wipe.png`,
      },
    });

    const generation = await prisma.imageGeneration.create({
      data: {
        userId,
        projectId: project.id,
        prompt: "wipe render",
        status: "ready",
        provider: "test",
        width: 64,
        height: 64,
        outputUploadId: upload.id,
        completedAt: new Date(),
      },
    });

    await prisma.inspirationItem.create({
      data: {
        userId,
        projectId: project.id,
        title: "wipe inspo",
        note: "personal inspo note",
        imageGenerationId: generation.id,
      },
    });

    await prisma.furnitureStudioPiece.create({
      data: {
        userId,
        prompt: "wipe piece",
        title: "Wipe chair",
        quality: {},
        status: "completed",
        imageGenerationId: generation.id,
      },
    });

    await prisma.styleProfile.create({
      data: { userId, displayName: "Wipe", styleWords: "calm" },
    });
    await prisma.budget.create({
      data: { userId, currency: "USD", minimum: 1000, maximum: 5000 },
    });
    await prisma.notificationPrefs.create({
      data: { userId, emailSecurity: true, emailUpdates: false },
    });
    await prisma.helpRequest.create({
      data: {
        userId,
        category: "account",
        message: "private help text",
      },
    });
    await prisma.emailToken.create({
      data: {
        userId,
        purpose: "verify_email",
        tokenDigest: `wipe-token-${userId}`,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await prisma.session.create({
      data: {
        userId,
        tokenDigest: `wipe-session-${userId}`,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await prisma.costLog.create({
      data: {
        userId,
        conversationId: conversation.id,
        model: "gpt-4o-mini",
        kind: "chat",
        inputTokens: 10,
        outputTokens: 5,
        costUsd: 0.001,
      },
    });

    await prisma.address.create({
      data: {
        userId,
        recipient: "Wipe Target",
        line1: "1 Wipe Street",
        city: "Singapore",
        postalCode: "018956",
        country: "SG",
        phone: "+6500000000",
        isDefault: true,
      },
    });
    await prisma.cart.create({
      data: { userId, currency: "SGD" },
    });
    await prisma.order.create({
      data: {
        userId,
        number: `WIPE-${Date.now()}`,
        status: "paid",
        currency: "SGD",
        subtotalCents: 1000,
        totalCents: 1000,
        shipRecipient: "Wipe Target",
        shipLine1: "1 Wipe Street",
        shipCity: "Singapore",
        shipPostalCode: "018956",
        shipCountry: "SG",
        shipPhone: "+6500000000",
        paymentProvider: "test",
        idempotencyKey: `wipe-order-${userId}`,
      },
    });

    const result = await deleteAccount(userId);
    expect(result.ok).toBe(true);

    const [
      prefs,
      proposals,
      feedback,
      signals,
      conversations,
      shares,
      roomPlans,
      roomItems,
      inspiration,
      studio,
      generations,
      uploads,
      projects,
      style,
      budget,
      notif,
      help,
      tokens,
      sessions,
      costLogs,
      addresses,
      carts,
      orders,
      userAfter,
    ] = await Promise.all([
      prisma.userPreference.count({ where: { userId } }),
      prisma.preferenceProposal.count({ where: { userId } }),
      prisma.messageFeedback.count({ where: { userId } }),
      prisma.implicitSignal.count({ where: { userId } }),
      prisma.conversation.count({ where: { userId } }),
      prisma.sharedProject.count({
        where: { conversation: { userId } },
      }),
      prisma.roomPlan.count({ where: { userId } }),
      prisma.roomPlanItem.count({ where: { plan: { userId } } }),
      prisma.inspirationItem.count({ where: { userId } }),
      prisma.furnitureStudioPiece.count({ where: { userId } }),
      prisma.imageGeneration.count({ where: { userId } }),
      prisma.upload.count({ where: { userId } }),
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.styleProfile.count({ where: { userId } }),
      prisma.budget.count({ where: { userId } }),
      prisma.notificationPrefs.count({ where: { userId } }),
      prisma.helpRequest.count({ where: { userId } }),
      prisma.emailToken.count({ where: { userId } }),
      prisma.session.count({ where: { userId } }),
      prisma.costLog.count({ where: { userId } }),
      prisma.address.count({ where: { userId } }),
      prisma.cart.count({ where: { userId } }),
      prisma.order.findMany({ where: { userId } }),
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    ]);

    expect(prefs).toBe(0);
    expect(proposals).toBe(0);
    expect(feedback).toBe(0);
    expect(signals).toBe(0);
    expect(conversations).toBe(0);
    expect(shares).toBe(0);
    expect(roomPlans).toBe(0);
    expect(roomItems).toBe(0);
    expect(inspiration).toBe(0);
    expect(studio).toBe(0);
    expect(generations).toBe(0);
    expect(uploads).toBe(0);
    expect(projects).toBe(0);
    expect(style).toBe(0);
    expect(budget).toBe(0);
    expect(notif).toBe(0);
    expect(help).toBe(0);
    expect(tokens).toBe(0);
    expect(sessions).toBe(0);
    expect(addresses).toBe(0);
    expect(carts).toBe(0);
    expect(orders).toHaveLength(1);
    expect(orders[0]?.shipRecipient).toBe("deleted");
    expect(orders[0]?.shipLine1).toBe("deleted");
    expect(orders[0]?.shipPhone).toBeNull();
    expect(orders[0]?.totalCents).toBe(1000);

    // Financial ledger retained; conversationId nulled by conversation cascade.
    expect(costLogs).toBe(1);
    const retained = await prisma.costLog.findFirst({ where: { userId } });
    expect(retained?.conversationId).toBeNull();
    expect(retained?.kind).toBe("chat");

    expect(userAfter.deletedAt).not.toBeNull();
    expect(userAfter.email).toBe(`deleted+${userId}@invalid.local`);
    expect(userAfter.displayName).toBeNull();
    expect(userAfter.passwordHash).toBe("deleted");

    // roomPlan id must not linger orphaned
    expect(
      await prisma.roomPlan.findUnique({ where: { id: roomPlan.id } }),
    ).toBeNull();
  });
});
