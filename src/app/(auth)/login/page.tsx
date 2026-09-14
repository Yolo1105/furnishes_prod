import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthSuspenseFallback } from "@/features/auth/AuthSuspenseFallback";
import { LoginForm } from "@/features/auth/LoginForm";
import { sanitizeNext } from "@/features/auth/clerk-custom";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (process.env.CLERK_SECRET_KEY) {
    try {
      const { userId } = await auth();
      if (userId) {
        const params = await searchParams;
        redirect(
          `/api/auth/clerk-callback?next=${encodeURIComponent(sanitizeNext(params.next))}`,
        );
      }
    } catch {
      /* Clerk unavailable during this request; show the form. */
    }
  }

  // Suspense only for useSearchParams inside the form — fallback matches chrome.
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <LoginForm />
    </Suspense>
  );
}
