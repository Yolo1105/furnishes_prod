import { clientIp, fromServiceResult, jsonError } from "@/server/http";
import { getSharedConversation } from "@/server/conversations/chat-share";
import { consumeRateLimit } from "@/server/auth/rate-limit";
import { logOps } from "@/server/ops/log";

type Params = { params: Promise<{ shareId: string }> };

function shareGetMaxAttempts(): number {
  const raw = Number(process.env.SHARE_GET_MAX_ATTEMPTS ?? "60");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60;
}

function shareGetWindowMs(): number {
  const raw = Number(process.env.SHARE_GET_WINDOW_MS ?? String(60_000));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60_000;
}

/** Anonymous read of a shared conversation (title + messages). No session. */
export async function GET(request: Request, { params }: Params) {
  const { shareId } = await params;
  const ip = clientIp(request) ?? "unknown";
  const limit = await consumeRateLimit(
    `share-get:${ip}`,
    shareGetMaxAttempts(),
    shareGetWindowMs(),
  );
  if (!limit.allowed) {
    logOps("warn", "share_get_rate_limited", { ip });
    return jsonError(
      429,
      "rate_limited",
      "Too many share requests. Try again later.",
    );
  }

  const result = await getSharedConversation(shareId);
  if (!result.ok) {
    logOps("info", "share_get_not_found", { ip });
  }
  return fromServiceResult(result);
}
