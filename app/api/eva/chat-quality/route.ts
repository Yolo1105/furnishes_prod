import { NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/eva/core/logger";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    name: z.string(),
    ts: z.number().optional(),
  })
  .passthrough();

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { name, ts, ...rest } = parsed.data;
    log({
      level: "info",
      event: "chat_quality",
      name,
      clientTs: ts,
      ...rest,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
