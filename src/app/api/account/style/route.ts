import {
  getStyleProfile,
  updateStyleProfile,
} from "@/server/account/style-profile";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  const profile = await getStyleProfile(session.user.id);
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const { session, response } = await requireApiSession();
  if (!session) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Invalid JSON body.");
  }

  return fromServiceResult(await updateStyleProfile(session.user.id, body));
}
