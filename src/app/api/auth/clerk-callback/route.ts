import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureSessionForClerkUser } from "@/server/auth/link-clerk-user";
import { sanitizeNext } from "@/features/auth/clerk-custom";

export async function GET(request: Request) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const session = await ensureSessionForClerkUser();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const dest = sanitizeNext(new URL(request.url).searchParams.get("next"));
  return NextResponse.redirect(new URL(dest, request.url));
}
