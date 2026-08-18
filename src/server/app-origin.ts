/**
 * The app's public origin, used anywhere we hand a URL to something outside the
 * request: verification emails, and payment return links.
 *
 * Production preflight already requires this to be set and https, so the
 * loopback fallback only ever applies to local development.
 */
export function appOrigin(): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (!configured) return "http://127.0.0.1:3000";
  // A trailing slash would produce `//account/...` when joined with a path.
  return configured.replace(/\/+$/, "");
}
