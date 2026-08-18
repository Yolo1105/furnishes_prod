"use client";

import Link from "next/link";
import { routes } from "@/lib/contracts/routes";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="furnishes-crash">
      <p className="furnishes-crash__kicker">Furnishes</p>
      <h1 className="furnishes-crash__t">Something went wrong</h1>
      <p className="furnishes-crash__p">
        This page hit an unexpected error. Try again, or return home.
      </p>
      <div className="furnishes-crash__act">
        <button
          type="button"
          className="furnishes-crash__btn"
          onClick={() => reset()}
        >
          Try again
        </button>
        <Link href={routes.home} className="furnishes-crash__link">
          Go home
        </Link>
      </div>
    </main>
  );
}
