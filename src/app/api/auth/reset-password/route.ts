import { resetPassword } from "@/server/auth/service";
import {
  assertSameOrigin,
  clientIp,
  fromServiceResult,
  jsonError,
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
  const record = (body ?? {}) as { token?: string; password?: string };
  const result = await resetPassword({
    token: record.token ?? "",
    password: record.password ?? "",
    ipAddress: clientIp(request),
  });
  return fromServiceResult(result);
}
