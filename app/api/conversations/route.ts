import { prisma } from "@/lib/eva/db";
import { mapDbErrorToResponse } from "@/lib/eva/api/db-error";
import { getSessionUserId } from "@/lib/eva/auth/helpers";
import { parseGuestSessionFromCookieHeader } from "@/lib/auth/guest-session";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId();
    const guestSessionId = parseGuestSessionFromCookieHeader(
      req.headers.get("cookie"),
    );

    const url = req.url ? new URL(req.url) : null;
    const projectIdFilter = url?.searchParams.get("projectId") ?? undefined;
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(
          url?.searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE),
          10,
        ) || DEFAULT_PAGE_SIZE,
      ),
    );
    const offset = Math.max(
      0,
      parseInt(url?.searchParams.get("offset") ?? "0", 10) || 0,
    );

    const baseWhere =
      userId != null
        ? { userId }
        : guestSessionId
          ? { userId: null, guestSessionId }
          : { id: "__none__" };

    const where =
      projectIdFilter && userId != null
        ? { ...baseWhere, projectId: projectIdFilter }
        : projectIdFilter === "" && userId != null
          ? { ...baseWhere, projectId: null }
          : baseWhere;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit + 1,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    const hasMore = conversations.length > limit;
    const page = conversations.slice(0, limit);

    return Response.json({
      conversations: page.map(
        (c: {
          id: string;
          title: string;
          isSaved: boolean;
          savedAt: Date | null;
          projectId: string | null;
          messages: { content: string }[];
          _count: { messages: number };
          updatedAt: Date;
        }) => ({
          id: c.id,
          title: c.title,
          isSaved: c.isSaved,
          savedAt: c.savedAt?.toISOString() ?? null,
          projectId: c.projectId ?? null,
          lastMessage: c.messages[0]?.content?.slice(0, 80) ?? "",
          messageCount: c._count.messages,
          updatedAt: c.updatedAt,
        }),
      ),
      hasMore,
      total,
    });
  } catch (e) {
    return mapDbErrorToResponse(e, "api_conversations_error");
  }
}
