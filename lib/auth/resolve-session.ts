/**
 * Server-side session resolver.
 *
 * Called from the account layout (Server Component). Returns the data
 * the SessionProvider needs to populate its context. Falls back to mock
 * data when:
 *   - DATABASE_URL not set (dev/demo)
 *   - Mock auth cookie present
 *
 * Single source of truth for "what data does the shell need" — page
 * wrappers no longer need to know.
 *
 * Mutations (Server Actions using `requireUser()`) still need a real
 * NextAuth session; the shell may show mock data defensively when none
 * exists, so do not assume `isMock` implies write-capable demo mode.
 *
 * **Production:** Unauthenticated or fatal errors do not fall back to the
 * demo user — redirect to `LOGIN_RETURN_TO_ACCOUNT` instead (except the
 * explicit mock-cookie path when mock auth is enabled).
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { auth } from "@/auth";
import { LOGIN_RETURN_TO_ACCOUNT } from "@/lib/auth/login-paths";
import { MOCK_USER_ID } from "@/lib/auth/mock-constants";
import { isMockAuthEnabled } from "@/lib/auth/mock-auth";
import { serverLog } from "@/lib/server/server-log";
import type { SessionUser } from "@/components/eva-dashboard/account/session-context";
import type { SessionCounts } from "@/lib/site/account/shell-counts";

const MOCK_USER: SessionUser = {
  id: MOCK_USER_ID,
  name: "Mohan Tan",
  email: "mohan@demo.furnishes.sg",
  image: null,
  initials: "MT",
};

const MOCK_COUNTS: SessionCounts = {
  conversations: 0,
  shortlist: 0,
  projects: 0,
  uploads: 0,
};

const MOCK_CART_COUNT = 3;

export type ResolvedSession = {
  user: SessionUser;
  counts: SessionCounts;
  cartCount: number;
  isMock: boolean;
};

function fallbackSession(): ResolvedSession {
  return {
    user: MOCK_USER,
    counts: MOCK_COUNTS,
    cartCount: MOCK_CART_COUNT,
    isMock: true,
  };
}

function isProdBuild(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Resolve everything the shell needs in one parallel fetch.
 * In development, tolerates missing session / errors with a mock shell user.
 * In production, unauthenticated users and unexpected failures redirect to
 * login instead of showing demo identity (mock-cookie path unchanged).
 */
export async function resolveSession(): Promise<ResolvedSession> {
  try {
    return await resolveSessionInner();
  } catch (e) {
    unstable_rethrow(e);
    serverLog("error", "resolve_session_fatal", { error: String(e) });
    if (isProdBuild()) {
      redirect(LOGIN_RETURN_TO_ACCOUNT);
    }
    return fallbackSession();
  }
}

async function resolveSessionInner(): Promise<ResolvedSession> {
  // Mock-auth path — dev/demo bypass
  const cookieStore = await cookies();
  const mockAllowed = isMockAuthEnabled();
  const hasMockCookie =
    mockAllowed && cookieStore.get("furnishes-mock-auth")?.value === "1";

  if (hasMockCookie) {
    return {
      user: MOCK_USER,
      counts: MOCK_COUNTS,
      cartCount: MOCK_CART_COUNT,
      isMock: true,
    };
  }

  // Real session
  const session = await auth().catch(() => null);
  if (!session?.user?.id || !session.user.email) {
    if (isProdBuild()) {
      redirect(LOGIN_RETURN_TO_ACCOUNT);
    }
    return {
      user: MOCK_USER,
      counts: MOCK_COUNTS,
      cartCount: 0,
      isMock: true,
    };
  }

  // DB present + real session → fetch counts in parallel
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/db/prisma");
      const userId = session.user.id;
      const [conversations, shortlist, projects, uploads, cart] =
        await Promise.all([
          prisma.conversation.count({ where: { userId } }),
          prisma.shortlistItem.count({ where: { userId } }),
          prisma.project.count({
            where: { userId, NOT: { status: "archived" } },
          }),
          prisma.upload.count({ where: { userId } }),
          prisma.cart.findUnique({
            where: { userId },
            include: { _count: { select: { items: true } } },
          }),
        ]);

      const name = session.user.name ?? session.user.email.split("@")[0]!;
      return {
        user: {
          id: userId,
          name,
          email: session.user.email,
          image: session.user.image ?? null,
          initials: computeInitials(name),
        },
        counts: { conversations, shortlist, projects, uploads },
        cartCount: cart?._count.items ?? 0,
        isMock: false,
      };
    } catch (e) {
      // DB hiccup — log + degrade to session-only
      serverLog("warn", "resolve_session_db_degraded", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Real session but no DB or DB failed — minimal fallback
  const name = session.user.name ?? session.user.email.split("@")[0]!;
  return {
    user: {
      id: session.user.id,
      name,
      email: session.user.email,
      image: session.user.image ?? null,
      initials: computeInitials(name),
    },
    counts: MOCK_COUNTS,
    cartCount: 0,
    isMock: false,
  };
}

function computeInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "··"
  );
}
