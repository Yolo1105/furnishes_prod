import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Minimal streaming response — no OpenAI key. Proves streaming path works for future `/api/chat`.
 */
export function GET() {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode("eva-stream-ok"));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
