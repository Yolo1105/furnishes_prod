import "server-only";

import type { Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import { auth } from "@/auth";
import { getAuthSecret } from "@/lib/auth/auth-secret";
import { rateLimit, STUDIO_API_LIMITS } from "@/lib/rate-limit";
import {
  isStudioEnabled,
  studioDisabledJsonResponse,
} from "@/lib/studio/studio-enabled";

export type StudioAuthContext = {
  userId: string;
  session: Session;
};

type JwtPayload = {
  sub?: string;
  id?: string;
  email?: string | null;
  name?: string | null;
};

/**
 * Resolve the signed-in user for `/api/studio/*`.
 *
 * Prefer `auth()` (full session). When it returns empty — e.g. JWT
 * callbacks touch Prisma and DB is unavailable in dev — fall back to
 * decoding the session JWT from the request cookie via `getToken`,
 * matching what `middleware` uses for `/playground`. Without this,
 * users pass the middleware gate but every studio route returns 401.
 */
async function resolveStudioUser(
  req: Request,
): Promise<{ userId: string; session: Session } | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return { userId: session.user.id, session };
    }
  } catch {
    // Session callback may throw if Prisma is misconfigured — try cookie JWT.
  }

  const token = (await getToken({
    req,
    secret: getAuthSecret(),
  })) as JwtPayload | null;

  if (!token) return null;

  const userId =
    typeof token.id === "string" && token.id.length > 0
      ? token.id
      : typeof token.sub === "string" && token.sub.length > 0
        ? token.sub
        : null;

  if (!userId) return null;

  const session = {
    user: {
      id: userId,
      email: token.email ?? "",
      name: token.name ?? null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session;

  return { userId, session };
}

/**
 * Session + per-user rate limit for `/api/studio/*`.
 */
export function withStudioAuth(
  routeKey: string,
  handler: (req: Request, ctx: StudioAuthContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (!isStudioEnabled()) {
      return studioDisabledJsonResponse();
    }
    const resolved = await resolveStudioUser(req);
    if (!resolved) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, session } = resolved;
    const limit = await rateLimit(
      `${userId}:${routeKey}`,
      STUDIO_API_LIMITS.default,
    );
    if (!limit.success) {
      return Response.json(
        { error: "Too many requests", resetAt: limit.resetAt },
        { status: 429 },
      );
    }
    return handler(req, { userId, session });
  };
}

/**
 * Same as `withStudioAuth`, for App Router handlers that receive
 * `context.params` (dynamic segments).
 */
export function withStudioAuthParams<
  P extends Record<string, string | string[]>,
>(
  routeKey: string,
  handler: (
    req: Request,
    ctx: StudioAuthContext,
    params: P,
  ) => Promise<Response>,
): (req: Request, context: { params: Promise<P> }) => Promise<Response> {
  return async (req, context) => {
    if (!isStudioEnabled()) {
      return studioDisabledJsonResponse();
    }
    const resolved = await resolveStudioUser(req);
    if (!resolved) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, session } = resolved;
    const limit = await rateLimit(
      `${userId}:${routeKey}`,
      STUDIO_API_LIMITS.default,
    );
    if (!limit.success) {
      return Response.json(
        { error: "Too many requests", resetAt: limit.resetAt },
        { status: 429 },
      );
    }
    const params = await context.params;
    return handler(req, { userId, session }, params);
  };
}
