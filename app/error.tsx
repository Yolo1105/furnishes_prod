"use client";

import { useEffect } from "react";

/**
 * Root error boundary — never show raw `error.message` to visitors (stack traces,
 * missing component names, etc.). Details stay in the console / monitoring.
 *
 * @see docs/MAINTENANCE.md — follow-up checklist when reviewing refactors.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="text-foreground flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 font-sans">
      <h1 className="text-xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-md text-center text-sm leading-relaxed opacity-90">
        We couldn&apos;t finish loading this page. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="bg-accent text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
