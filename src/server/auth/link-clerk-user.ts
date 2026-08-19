import { headers } from "next/headers";
import { currentUser, type User as ClerkUser } from "@clerk/nextjs/server";
import { prisma } from "@/server/db";
import { digestToken } from "@/server/auth/crypto";
import {
  createSession,
  getOptionalCurrentSession,
  setSessionCookie,
  type CurrentSession,
} from "@/server/auth/session";

/**
 * Clerk OAuth users have no password. This hash never verifies; email/password
 * login for the same address still works if the user already had one.
 */
const CLERK_PASSWORD_PLACEHOLDER = "scrypt$16384$8$1$clerk$unusable";

function clerkEmail(user: ClerkUser): string | null {
  const primary = user.emailAddresses.find(
    (row) => row.id === user.primaryEmailAddressId,
  );
  const email = (primary ?? user.emailAddresses[0])?.emailAddress?.trim();
  return email ? email.toLowerCase() : null;
}

function clerkDisplayName(user: ClerkUser, email: string): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.username?.trim() || email.split("@")[0] || "Member";
}

export async function ensureSessionForClerkUser(): Promise<CurrentSession | null> {
  const existing = await getOptionalCurrentSession();
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const email = clerkEmail(clerkUser);
  if (!email) return null;

  const displayName = clerkDisplayName(clerkUser, email);
  const verified =
    clerkUser.emailAddresses.some(
      (row) =>
        row.emailAddress.toLowerCase() === email &&
        row.verification?.status === "verified",
    ) || Boolean(clerkUser.primaryEmailAddress?.verification?.status);

  const user = await prisma.user.upsert({
    where: { email },
    update: verified
      ? { deletedAt: null, displayName, emailVerifiedAt: new Date() }
      : { deletedAt: null, displayName },
    create: {
      email,
      passwordHash: CLERK_PASSWORD_PLACEHOLDER,
      displayName,
      emailVerifiedAt: verified ? new Date() : null,
      styleProfile: { create: { displayName, styleWords: "" } },
      budget: { create: { currency: "SGD" } },
      notificationPrefs: { create: {} },
    },
  });

  const requestHeaders = await headers();
  const session = await createSession({
    userId: user.id,
    userAgent: requestHeaders.get("user-agent"),
    ipAddress:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  await setSessionCookie(session.token, session.expiresAt);

  return {
    sessionId: (
      await prisma.session.findUniqueOrThrow({
        where: { tokenDigest: digestToken(session.token) },
      })
    ).id,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerifiedAt: user.emailVerifiedAt,
      memoryEnabled: user.memoryEnabled,
      currency: user.currency,
      createdAt: user.createdAt,
    },
    expiresAt: session.expiresAt,
  };
}
