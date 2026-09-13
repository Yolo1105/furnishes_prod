import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function passThrough() {
  return NextResponse.next();
}

const clerk = clerkEnabled ? clerkMiddleware() : null;

export default async function proxy(
  ...args: Parameters<NonNullable<typeof clerk>>
) {
  if (!clerk) return passThrough();
  try {
    return await clerk(...args);
  } catch {
    return passThrough();
  }
}

export const config = {
  matcher: [
    "/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/health)|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
