import { Suspense } from "react";
import { AuthSuspenseFallback } from "@/features/auth/AuthSuspenseFallback";
import { VerifyEmailClient } from "@/features/auth/VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
