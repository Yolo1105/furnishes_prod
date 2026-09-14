import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSuspenseFallback } from "@/features/auth/AuthSuspenseFallback";
import { VerifyEmailClient } from "@/features/auth/VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify Email",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
