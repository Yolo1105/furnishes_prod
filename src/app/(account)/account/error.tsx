"use client";

import Link from "next/link";
import { routes } from "@/lib/contracts/routes";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="wireview">
      <div className="wf-crash" role="alert">
        <p className="wf-crash__kicker">Studio</p>
        <h1 className="wf-crash__t">This page couldn’t load</h1>
        <p className="wf-crash__p">
          Something interrupted the workspace. Try again, or go back to chat and
          continue from there.
        </p>
        <div className="wf-crash__act">
          <button type="button" className="wf-crash__btn" onClick={reset}>
            Try again
          </button>
          <Link href={routes.accountChat} className="wf-crash__link">
            Back to chat
          </Link>
        </div>
        {error.digest ? (
          <p className="wf-crash__ref">Reference {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
