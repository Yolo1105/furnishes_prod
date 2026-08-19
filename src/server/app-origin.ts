/**
 * The app's public origin, used anywhere we hand a URL to something outside the
 * request: verification emails, and payment return links.
 *
 * Production preflight requires https. On Vercel, APP_ORIGIN can be omitted and
 * the platform host is used so preview/production deploys boot without a second
 * copy of the domain.
 */
export function resolvedPublicOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = (env.APP_ORIGIN ?? "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  const host = (
    env.VERCEL_PROJECT_PRODUCTION_URL ??
    env.VERCEL_URL ??
    ""
  ).trim();
  if (!host) return "";
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.replace(/\/+$/, "");
  }
  return `https://${host.replace(/\/+$/, "")}`;
}

export function appOrigin(): string {
  return resolvedPublicOrigin() || "http://127.0.0.1:3000";
}
