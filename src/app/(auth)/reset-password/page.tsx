import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSuspenseFallback } from "@/features/auth/AuthSuspenseFallback";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
