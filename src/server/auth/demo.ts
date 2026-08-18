import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/crypto";
import {
  authDemoMaxAttempts,
  authRateLimitWindowMs,
  consumeRateLimit,
} from "@/server/auth/rate-limit";
import { recordSecurityEvent } from "@/server/auth/security-events";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { DEFAULT_ROOM_ALLOCATIONS } from "@/server/account/budget-schema";
import { err, ok, type ServiceResult } from "@/server/result";

const DEMO_EMAIL = "demo@furnishes.local";
const DEMO_PASSWORD = "demo-password-not-for-production";
const DEMO_ALLOCATIONS_JSON = JSON.stringify(DEFAULT_ROOM_ALLOCATIONS);

export function isDemoSignInEnabled(): boolean {
  if (process.env.ALLOW_DEMO_SIGNIN === "1") return true;
  if (process.env.ALLOW_DEMO_SIGNIN === "0") return false;
  return process.env.NODE_ENV !== "production";
}

async function ensureDemoUser() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      displayName: "Demo Studio",
      emailVerifiedAt: new Date(),
      styleProfile: {
        create: {
          displayName: "Demo Studio",
          styleWords: "warm minimalist, oak, linen, soft contrast",
        },
      },
      budget: {
        create: {
          minimum: 15000,
          maximum: 20000,
          currency: "SGD",
          allocationsJson: DEMO_ALLOCATIONS_JSON,
        },
      },
      notificationPrefs: { create: {} },
    },
    update: {
      passwordHash,
      displayName: "Demo Studio",
      deletedAt: null,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.budget.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      minimum: 15000,
      maximum: 20000,
      currency: "SGD",
      allocationsJson: DEMO_ALLOCATIONS_JSON,
    },
    update: {
      minimum: 15000,
      maximum: 20000,
      currency: "SGD",
      allocationsJson: DEMO_ALLOCATIONS_JSON,
    },
  });

  await prisma.styleProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: "Demo Studio",
      styleWords: "warm minimalist, oak, linen, soft contrast",
    },
    update: {
      displayName: "Demo Studio",
      styleWords: "warm minimalist, oak, linen, soft contrast",
    },
  });

  const projectCount = await prisma.project.count({
    where: { ownerId: user.id },
  });
  if (projectCount === 0) {
    const project = await prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Living room refresh",
        summary: "Warm scandi living room for the demo account",
        brief: "Keep clutter low and materials natural.",
        status: "active",
        members: { create: { userId: user.id, role: "owner" } },
        timeline: {
          create: { kind: "created", summary: "Demo project created" },
        },
      },
    });

    await prisma.conversation.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title: "Living room direction",
        status: "active",
        messages: {
          create: [
            {
              role: "user",
              content: "Can we warm up the living room?",
              status: "complete",
            },
            {
              role: "assistant",
              content:
                "Start with oak and linen layers. This is the local studio fallback reply.",
              status: "complete",
            },
          ],
        },
      },
    });
  }

  return user;
}

export async function demoSignIn(input: {
  userAgent?: string | null | undefined;
  ipAddress?: string | null | undefined;
}): Promise<ServiceResult<{ userId: string }, "disabled" | "rate_limited">> {
  if (!isDemoSignInEnabled()) {
    return err("disabled", "Demo sign-in is not enabled.");
  }

  const rate = await consumeRateLimit(
    `demo:ip:${input.ipAddress?.trim() || "unknown"}`,
    authDemoMaxAttempts(),
    authRateLimitWindowMs(),
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const user = await ensureDemoUser();
  const session = await createSession({
    userId: user.id,
    ...(input.userAgent !== undefined ? { userAgent: input.userAgent } : {}),
    ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
  });
  await setSessionCookie(session.token, session.expiresAt);

  await recordSecurityEvent({
    userId: user.id,
    kind: "demo_signin",
    ipAddress: input.ipAddress,
  });

  return ok({ userId: user.id });
}
