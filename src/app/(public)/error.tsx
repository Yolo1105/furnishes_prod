"use client";

import ErrorPage from "@/app/error";

export default function PublicError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ErrorPage error={error} reset={reset} />;
}
