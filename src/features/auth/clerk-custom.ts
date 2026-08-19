export const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);
const SSO_CALLBACK = "/sso-callback";
const NEXT_KEY = "furnishes_clerk_next";

export function sanitizeNext(next?: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/account";
}

export function rememberClerkNext(next?: string | null) {
  try {
    sessionStorage.setItem(NEXT_KEY, sanitizeNext(next));
  } catch {
    /* private mode */
  }
}

export function peekClerkNext() {
  try {
    return sanitizeNext(sessionStorage.getItem(NEXT_KEY));
  } catch {
    return "/account";
  }
}

export function clerkCallbackHref(next?: string | null) {
  const dest = next ? sanitizeNext(next) : peekClerkNext();
  return `/api/auth/clerk-callback?next=${encodeURIComponent(dest)}`;
}

export function clerkGoogleSso(next?: string | null) {
  rememberClerkNext(next);
  return {
    strategy: "oauth_google" as const,
    redirectCallbackUrl: SSO_CALLBACK,
    redirectUrl: clerkCallbackHref(next),
  };
}

export function messageFromClerkError(err: unknown, fallback: string) {
  if (!err || typeof err !== "object") return fallback;
  const row = err as {
    longMessage?: string;
    message?: string;
    errors?: Array<{ longMessage?: string; message?: string }>;
  };
  return (
    row.longMessage ||
    row.message ||
    row.errors?.[0]?.longMessage ||
    row.errors?.[0]?.message ||
    fallback
  );
}
