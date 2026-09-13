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

const clerkCsp = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://*.clerk.services",
  "https://challenges.cloudflare.com",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js requires inline scripts/styles for hydration and CSS-in-JS.
  // Clerk loads clerk-js from *.clerk.accounts.dev.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkCsp}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  // GLTF embedded textures resolve via blob: URLs; HDRI is self-hosted under /studio/hdri/.
  `connect-src 'self' blob: ${clerkCsp}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  `frame-src 'self' ${clerkCsp}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // Clerk OAuth posts out to Clerk, then Google. 'self' alone leaves the button spinning.
  `form-action 'self' ${clerkCsp} https://accounts.google.com`,
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
  // Standalone is for Docker (`node .next/standalone/server.js`). Skip it on
  // Vercel (adapter + standalone 500s every route on Next 16.3) and E2E
  // (`next start` is unsupported with standalone).
  ...(process.env.VERCEL === "1" || process.env.FURNISHES_E2E_BUILD === "1"
    ? {}
    : { output: "standalone" as const }),
  // Pin Turbopack roots locally so a home-directory lockfile does not watch
  // the whole machine. On Vercel the injected adapter owns tracing — a pinned
  // root there has been omitting server files and 500ing every route.
  ...(process.env.VERCEL === "1"
    ? {}
    : {
        outputFileTracingRoot: projectRoot,
        turbopack: { root: projectRoot },
      }),
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
