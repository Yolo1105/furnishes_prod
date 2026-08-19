import { logout } from "@/server/auth/service";
import { getOptionalCurrentSession } from "@/server/auth/session";
import { jsonOk } from "@/server/http";
import { routes } from "@/lib/contracts/routes";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getOptionalCurrentSession();
  if (session) {
    await logout(session.sessionId, session.user.id);
  }
  return jsonOk({ ok: true });
}

export async function GET(request: Request) {
  const session = await getOptionalCurrentSession();
  if (session) {
    await logout(session.sessionId, session.user.id);
  }
  return NextResponse.redirect(new URL(routes.login, request.url));
}
