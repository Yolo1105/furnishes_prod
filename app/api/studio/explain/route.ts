import { withStudioAuth } from "@/lib/studio/server/auth";
import { studioCostGuard } from "@/lib/studio/server/cost-guard";

export const dynamic = "force-dynamic";

export const POST = withStudioAuth("studio:explain", async (_req, ctx) => {
  const gate = await studioCostGuard({ userId: ctx.userId, estimatedUsd: 0 });
  if (!gate.ok) return gate.response;
  return Response.json({ ok: true });
});
