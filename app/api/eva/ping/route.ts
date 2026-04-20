import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** No DB — confirms App Router API + Eva namespace. */
export function GET() {
  return NextResponse.json({ ok: true, service: "eva", ping: "pong" });
}
