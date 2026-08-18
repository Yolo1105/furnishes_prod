import { updateBudget, getBudget } from "@/server/account/budget";
import { fromServiceResult, jsonError, requireApiSession } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, response } = await requireApiSession();
  if (!session) return response;
  return NextResponse.json(await getBudget(session.user.id));
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

  return fromServiceResult(await updateBudget(session.user.id, body));
}
