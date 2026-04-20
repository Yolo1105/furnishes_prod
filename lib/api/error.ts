import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/auth";
import { ForbiddenError } from "@/lib/auth/authorize";

/**
 * Uniform error response for API route handlers.
 *
 *   try { ... } catch (e) { return apiError(e); }
 */
export function apiError(e: unknown): NextResponse {
  if (e instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: e.message },
      { status: 401 },
    );
  }
  if (e instanceof ForbiddenError) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: e.message },
      { status: 403 },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "VALIDATION", issues: e.issues },
      { status: 422 },
    );
  }
  console.error("[api] unexpected error:", e);
  return NextResponse.json(
    { error: "INTERNAL", message: "Something went wrong" },
    { status: 500 },
  );
}
