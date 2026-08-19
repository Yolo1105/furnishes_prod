import { auth } from "@clerk/nextjs/server";
import { ensureSessionForClerkUser } from "@/server/auth/link-clerk-user";
import { assertSameOrigin, jsonError, jsonOk } from "@/server/http";

/** Finish the app session after Google if the user left /login mid-redirect. */
export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  if (!process.env.CLERK_SECRET_KEY) {
    return jsonError(401, "unauthorized", "Sign in to continue.");
  }
  const { userId } = await auth();
  if (!userId) {
    return jsonError(401, "unauthorized", "Sign in to continue.");
  }
  const session = await ensureSessionForClerkUser();
  if (!session) {
    return jsonError(500, "auth_failed", "Could not finish sign-in.");
  }
  return jsonOk({ ok: true });
}
