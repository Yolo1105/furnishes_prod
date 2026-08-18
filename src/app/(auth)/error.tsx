"use client";

import ErrorPage from "@/app/error";

export default function AuthError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ErrorPage error={error} reset={reset} />;
}
