import { authCopy, requestPasswordReset } from "@/server/auth/service";
import {
  assertSameOrigin,
  clientIp,
  fromServiceResult,
  jsonError,
  jsonOk,
} from "@/server/http";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }
  const record = (body ?? {}) as { email?: string };
  const result = await requestPasswordReset({
    email: record.email ?? "",
    ipAddress: clientIp(request),
  });
  if (!result.ok) {
    return fromServiceResult(result);
  }
  return jsonOk({ ok: true, message: authCopy.GENERIC_RECOVERY });
}
