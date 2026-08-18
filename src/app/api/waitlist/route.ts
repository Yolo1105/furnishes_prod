import { joinWaitlist } from "@/server/waitlist/service";
import { clientIp, fromServiceResult, jsonError } from "@/server/http";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid", "Invalid JSON body.");
  }

  const email =
    typeof body === "object" &&
    body &&
    "email" in body &&
    typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";

  return fromServiceResult(
    await joinWaitlist({
      email,
      ipKey: clientIp(request),
    }),
    {
      invalid: 400,
      duplicate: 409,
      unavailable: 503,
      rate_limited: 429,
    },
  );
}
