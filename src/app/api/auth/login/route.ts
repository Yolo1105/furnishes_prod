import { login } from "@/server/auth/service";
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
  const record = (body ?? {}) as { email?: string; password?: string };
  const result = await login({
    email: record.email ?? "",
    password: record.password ?? "",
    userAgent: request.headers.get("user-agent"),
    ipAddress: clientIp(request),
  });
  return fromServiceResult(result);
}
