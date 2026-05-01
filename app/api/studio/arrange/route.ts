import { withStudioAuth } from "@/lib/studio/server/auth";
import { studioCostGuard } from "@/lib/studio/server/cost-guard";
import { assertStudioFalConfigured } from "@/lib/studio/server/studio-fal-config";

export const dynamic = "force-dynamic";

export const POST = withStudioAuth("studio:arrange", async (_req, ctx) => {
  const fal = assertStudioFalConfigured();
  if (!fal.ok) return fal.response;
  const gate = await studioCostGuard({ userId: ctx.userId, estimatedUsd: 0 });
  if (!gate.ok) return gate.response;
  return Response.json({ ok: true });
});
