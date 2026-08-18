import { resendVerification } from "@/server/auth/service";
import {
  clientIp,
  fromServiceResult,
  jsonError,
  requireApiSession,
} from "@/server/http";

export async function POST(request: Request) {
  const { session, response } = await requireApiSession({
    allowUnverified: true,
  });
  if (!session) return response;
  if (session.user.emailVerifiedAt) {
    return jsonError(400, "validation", "Email is already verified.");
  }
  return fromServiceResult(
    await resendVerification({
      userId: session.user.id,
      email: session.user.email,
      ipAddress: clientIp(request),
    }),
  );
}
