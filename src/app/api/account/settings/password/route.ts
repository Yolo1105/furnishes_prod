import { changePassword } from "@/server/auth/service";
import {
  clientIp,
  fromServiceResult,
  jsonError,
  requireApiSession,
} from "@/server/http";

export async function POST(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  const record = (body ?? {}) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  if (
    typeof record.newPassword === "string" &&
    typeof record.confirmPassword === "string" &&
    record.newPassword !== record.confirmPassword
  ) {
    return jsonError(400, "validation", "Check the highlighted fields.", {
      confirmPassword: "Passwords do not match.",
    });
  }

  return fromServiceResult(
    await changePassword({
      userId: session.user.id,
      currentSessionId: session.sessionId,
      currentPassword: record.currentPassword ?? "",
      newPassword: record.newPassword ?? "",
      ipAddress: clientIp(request),
    }),
  );
}
