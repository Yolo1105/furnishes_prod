import { Suspense } from "react";
import { AuthSuspenseFallback } from "@/features/auth/AuthSuspenseFallback";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
