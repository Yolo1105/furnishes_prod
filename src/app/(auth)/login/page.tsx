import { Suspense } from "react";
import { AuthSuspenseFallback } from "@/features/auth/AuthSuspenseFallback";
import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSuspenseFallback />}>
      <LoginForm />
    </Suspense>
  );
}
