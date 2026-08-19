import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import type { User } from "@prisma/client";
import { isDatabaseUnreachable, prisma } from "@/server/db";
import { logOps } from "@/server/ops/log";
import { createRandomToken, digestToken } from "@/server/auth/crypto";
import { blocksForEmailVerification } from "@/server/auth/email-verification";
import { recordSecurityEvent } from "@/server/auth/security-events";
import { routes } from "@/lib/contracts/routes";

const SESSION_COOKIE = "furnishes_session";

function sessionTtlMs(): number {
  const days = Number(process.env.AUTH_SESSION_TTL_DAYS ?? "14");
  const safe = Number.isFinite(days) && days > 0 ? Math.floor(days) : 14;
  return safe * 24 * 60 * 60 * 1000;
}

type CurrentSession = {
  sessionId: string;
  user: Pick<
    User,
    | "id"
    | "email"
    | "displayName"
    | "emailVerifiedAt"
    | "memoryEnabled"
    | "currency"
    | "createdAt"
  >;
  expiresAt: Date;
};

export type { CurrentSession };

type ActiveSessionItem = {
  id: string;
  current: boolean;
  label: string;
  detail: string;
  lastSeenLabel: string;
  ipAddress: string | null;
};

function cookieSecure(): boolean {
  if (process.env.AUTH_COOKIE_SECURE != null) {
    return process.env.AUTH_COOKIE_SECURE === "1";
  }
  if (process.env.VERCEL === "1") return true;
  const origin = process.env.APP_ORIGIN ?? "";
  return origin.startsWith("https://");
}

function describeUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim() || "";
  if (!ua) return "Unknown browser";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad/i.test(ua)
        ? "iOS"
        : /Mac OS|Macintosh/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "device";
  return `${browser} · ${os}`;
}

function formatLastSeen(lastSeenAt: Date, now = new Date()): string {
  const deltaMs = Math.max(0, now.getTime() - lastSeenAt.getTime());
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 2) return "Active now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function describeNetwork(ipAddress: string | null | undefined): string {
  const ip = ipAddress?.trim();
  if (!ip) return "Unknown network";
  const normalized = ip.toLowerCase();
  if (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "0:0:0:0:0:0:0:1"
  ) {
    return "Local network";
  }
  if (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    /^fc[0-9a-f]{2}:/i.test(ip) ||
    /^fd[0-9a-f]{2}:/i.test(ip) ||
    /^fe80:/i.test(ip)
  ) {
    return "Private network";
  }
  return ip;
}

export async function createSession(input: {
  userId: string;
  userAgent?: string | null | undefined;
  ipAddress?: string | null | undefined;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = createRandomToken(32);
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenDigest: digestToken(token),
      expiresAt,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getOptionalCurrentSession(): Promise<CurrentSession | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenDigest: digestToken(token) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            emailVerifiedAt: true,
            memoryEnabled: true,
            currency: true,
            createdAt: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.deletedAt
    ) {
      return null;
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.displayName,
        emailVerifiedAt: session.user.emailVerifiedAt,
        memoryEnabled: session.user.memoryEnabled,
        currency: session.user.currency,
        createdAt: session.user.createdAt,
      },
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error;
    logOps("warn", "session_db_unreachable", {
      message: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return null;
  }
}

export async function requireCurrentSession(options?: {
  redirectTo?: string;
}): Promise<CurrentSession> {
  const session = await getOptionalCurrentSession();
  if (!session) {
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const { userId } = await auth();
        if (userId) redirect("/api/auth/clerk-callback");
      } catch {
        /* Clerk unavailable; send the user to login. */
      }
    }
    const next = options?.redirectTo ?? routes.login;
    redirect(`${next}?next=${encodeURIComponent(routes.account)}`);
  }
  if (blocksForEmailVerification(session.user)) {
    redirect(routes.verifyEmail);
  }
  return session;
}

export async function listActiveSessions(
  userId: string,
  currentSessionId: string,
): Promise<ActiveSessionItem[]> {
  const rows = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
  });

  return rows.map((row) => {
    const current = row.id === currentSessionId;
    const label = describeUserAgent(row.userAgent);
    const where = describeNetwork(row.ipAddress);
    return {
      id: row.id,
      current,
      label,
      detail: current
        ? `${where} · active now in this browser session.`
        : `${where} · signed-in session.`,
      lastSeenLabel: current ? "Active now" : formatLastSeen(row.lastSeenAt),
      ipAddress: row.ipAddress,
    };
  });
}

export async function revokeSession(
  sessionId: string,
  options?: { userId?: string; kind?: string },
): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (options?.userId) {
    await recordSecurityEvent({
      userId: options.userId,
      kind: options.kind ?? "session_revoked",
      meta: { sessionId },
    });
  }
}

export async function revokeOtherSessions(
  userId: string,
  keepSessionId: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      id: { not: keepSessionId },
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  if (result.count > 0) {
    await recordSecurityEvent({
      userId,
      kind: "session_revoked_others",
      meta: { count: result.count, keepSessionId },
    });
  }
  return result.count;
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
