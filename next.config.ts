import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Production config.
 *
 * Intentionally minimal: no image domains, no rewrites, no external services.
 * Frozen designs under `reference/` are evidence only and are never part of
 * the build.
 *
 * Security headers are owned by this app config (not assumed at the reverse
 * proxy). Proxies must forward them; they may add complementary controls but
 * must not strip these.
 */
const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js requires inline scripts/styles for hydration and CSS-in-JS.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // GLTF embedded textures resolve via blob: URLs; HDRI is self-hosted under /studio/hdri/.
  "connect-src 'self' blob:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders: Array<{ key: string; value: string }> = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hide the Next.js compile badge during client navigations.
  devIndicators: false,
  // Enables `node .next/standalone/server.js` and the production Dockerfile.
  output: "standalone",
  // A lockfile in the home directory made Turbopack treat ~ as the workspace
  // root and watch the whole machine — that is the hitch-pause-continue loop
  // in `pnpm dev`. Pin both roots to this repo.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingIncludes: {
    "/*": ["./prisma/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
