import { prisma } from "@/lib/eva/db";
import { requireConversationAccess } from "@/lib/eva/auth/helpers";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const access = await requireConversationAccess(id, req);
  if (access.error) {
    return apiError(
      access.status === 404 ? ErrorCodes.NOT_FOUND : ErrorCodes.FORBIDDEN,
      access.error,
      access.status,
    );
  }
  const currentNodeId = access.conversation?.currentNodeId ?? null;

  // Preference change events
  const changes = await prisma.preferenceChange.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  const events = changes.map(
    (c: {
      id: string;
      createdAt: Date;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      confidence: number;
      changeType: string;
      confirmed: boolean;
    }) => ({
      id: c.id,
      time: c.createdAt.toISOString(),
      field: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      confidence: c.confidence,
      action: c.changeType,
      confirmed: c.confirmed,
    }),
  );

  // Playbook node transitions
  const transitions = await prisma.nodeTransition.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
  });
  const nodeTransitions = transitions.map(
    (t: {
      id: string;
      createdAt: Date;
      fromNodeId: string | null;
      toNodeId: string;
      edgeId: string | null;
      reason: string | null;
    }) => ({
      id: t.id,
      time: t.createdAt.toISOString(),
      fromNodeId: t.fromNodeId,
      toNodeId: t.toNodeId,
      edgeId: t.edgeId,
      reason: t.reason,
    }),
  );

  // Current preferences (for "what's filled" display)
  const preferences = await prisma.preference.findMany({
    where: { conversationId: id },
  });
  const filledFields = preferences
    .filter(
      (p: { value: string | null }) =>
        p.value !== null && String(p.value).trim() !== "",
    )
    .map((p: { field: string }) => p.field);

  return Response.json({
    events,
    nodeTransitions,
    currentNodeId,
    filledFields,
  });
}
