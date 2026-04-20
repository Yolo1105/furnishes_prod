import { getDomainConfig } from "@/lib/eva/domain/config";
import { apiError, ErrorCodes } from "@/lib/eva/api/error";
import { log } from "@/lib/eva/core/logger";

export const dynamic = "force-dynamic";

/**
 * Client-safe domain config (aligned with `chatbot_v3` /api/config).
 * Used by Eva dashboard right sidebar + discover view.
 */
export async function GET() {
  try {
    const config = getDomainConfig();
    return Response.json({
      name: config.name,
      fields: config.fields,
      recommendations: config.recommendations
        ? { enabled: config.recommendations.enabled }
        : undefined,
    });
  } catch (e) {
    log({ level: "error", event: "api_config_error", error: String(e) });
    const message =
      process.env.NODE_ENV === "production"
        ? "Configuration unavailable."
        : e instanceof Error
          ? e.message
          : "Config failed";
    return apiError(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}
