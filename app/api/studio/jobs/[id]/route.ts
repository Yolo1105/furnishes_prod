import { withStudioAuth } from "@/lib/studio/server/auth";

export const dynamic = "force-dynamic";

export const GET = withStudioAuth("studio:jobs:get", async () =>
  Response.json({ ok: true, status: "pending" as const }),
);
