import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/eva/db";
import { logSecurityEvent } from "@/lib/eva/core/security-logger";
import {
  GUEST_SESSION_COOKIE,
  parseGuestSessionFromCookieHeader,
} from "@/lib/auth/guest-session";

/** Current signed-in user id, or null (anonymous / not signed in). */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function getGuestSessionIdFromRequestLike(
  req?: Request,
): Promise<string | null> {
  if (req) {
    return parseGuestSessionFromCookieHeader(req.headers.get("cookie"));
  }
  try {
    const c = await cookies();
    return c.get(GUEST_SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Access control for conversations: signed-in owner, invited share recipient,
 * or matching guest session for rows without userId.
 */
export async function requireConversationAccess(
  conversationId: string,
  req?: Request,
) {
  const userId = await getSessionUserId();
  const guestSessionId = await getGuestSessionIdFromRequestLike(req);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    ...(userId
      ? {
          include: {
            conversationShares: {
              where: { sharedWithUserId: userId },
              select: { id: true },
            },
          },
        }
      : {}),
  });
  if (!conversation) {
    return { error: "Not found", status: 404, conversation: null };
  }

  const shareList =
    "conversationShares" in conversation &&
    Array.isArray(conversation.conversationShares)
      ? conversation.conversationShares
      : [];
  const shareOk = !!userId && shareList.length > 0;

  if (conversation.userId) {
    if (userId && conversation.userId === userId) {
      return { error: null, status: 200, conversation };
    }
    if (shareOk) {
      return { error: null, status: 200, conversation };
    }
    logSecurityEvent({
      type: "auth_failure",
      conversationId,
      userId: userId ?? undefined,
      details: "Forbidden",
    });
    return { error: "Forbidden", status: 403, conversation: null };
  }

  // Guest-owned conversation (no userId on row)
  if (!conversation.guestSessionId) {
    logSecurityEvent({
      type: "auth_failure",
      conversationId,
      userId: userId ?? undefined,
      details: "Legacy guest conversation",
    });
    return { error: "Forbidden", status: 403, conversation: null };
  }

  // Invited user can access guest-owned chats without the guest cookie
  if (shareOk) {
    return { error: null, status: 200, conversation };
  }

  if (guestSessionId && guestSessionId === conversation.guestSessionId) {
    return { error: null, status: 200, conversation };
  }

  logSecurityEvent({
    type: "auth_failure",
    conversationId,
    userId: userId ?? undefined,
    details: "Forbidden guest",
  });
  return { error: "Forbidden", status: 403, conversation: null };
}
