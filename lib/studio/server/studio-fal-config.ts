import "server-only";

import { getEvaEnv } from "@/lib/eva/core/env";

/** Fal-backed Studio routes require a server Fal key. */
export function assertStudioFalConfigured():
  | { ok: true }
  | { ok: false; response: Response } {
  const env = getEvaEnv();
  const key =
    env.FAL_API_KEY?.trim() ||
    env.FAL_KEY?.trim() ||
    process.env.FAL_KEY?.trim() ||
    process.env.FAL_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            "Fal is not configured (set FAL_KEY or FAL_API_KEY for this Studio route)",
          code: "STUDIO_FAL_UNAVAILABLE",
        },
        { status: 503 },
      ),
    };
  }
  return { ok: true };
}
