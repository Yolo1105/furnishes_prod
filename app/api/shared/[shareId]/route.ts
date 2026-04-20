import { prisma } from "@/lib/eva/db";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  const shared = await prisma.sharedProject.findUnique({
    where: { shareId },
    include: { conversation: true },
  });
  if (!shared) return apiError(ErrorCodes.NOT_FOUND, "Not found", 404);
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return apiError(ErrorCodes.NOT_FOUND, "Link expired", 404);
  }
  const prefs = await prisma.preference.findMany({
    where: { conversationId: shared.conversationId },
  });
  const preferences: Record<string, string> = {};
  for (const p of prefs) preferences[p.field] = p.value;
  const summary = shared.conversation.title || "Design brief";
  return Response.json({ preferences, summary });
}
