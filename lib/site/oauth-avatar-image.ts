/**
 * Hostnames allowed for next/image on OAuth / common provider profile photos.
 * Keep in sync with `next.config.ts` `images.remotePatterns` (spread from
 * `oauthAvatarRemotePatterns()`).
 */
const OPTIMIZABLE_AVATAR_HOSTNAMES = new Set([
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "avatars.githubusercontent.com",
]);

export function oauthAvatarRemotePatterns(): Array<{
  protocol: "https";
  hostname: string;
  pathname: "/**";
}> {
  return [...OPTIMIZABLE_AVATAR_HOSTNAMES].map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/**",
  }));
}

/** True when `next/image` can optimize this HTTPS avatar URL (domain allowlisted). */
export function isOptimizableOAuthAvatarUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return OPTIMIZABLE_AVATAR_HOSTNAMES.has(u.hostname);
  } catch {
    return false;
  }
}
