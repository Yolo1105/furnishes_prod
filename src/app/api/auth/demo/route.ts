import { demoSignIn, isDemoSignInEnabled } from "@/server/auth/demo";
import {
  assertSameOrigin,
  clientIp,
  fromServiceResult,
  jsonError,
} from "@/server/http";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  if (!isDemoSignInEnabled()) {
    return jsonError(403, "disabled", "Demo sign-in is not enabled.");
  }

  const result = await demoSignIn({
    userAgent: request.headers.get("user-agent"),
    ipAddress: clientIp(request),
  });
  return fromServiceResult(result, { disabled: 403 });
}
