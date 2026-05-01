import { withStudioAuth } from "@/lib/studio/server/auth";

export const dynamic = "force-dynamic";

export const GET = withStudioAuth("studio:health", async () =>
  Response.json({ ok: true }),
);
