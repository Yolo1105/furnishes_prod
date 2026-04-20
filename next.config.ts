import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { productionContentSecurityPolicy } from "./lib/site/content-security-policy";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
let r2Hostname: string | null = null;
if (r2PublicUrl) {
  try {
    r2Hostname = new URL(r2PublicUrl).hostname;
  } catch {
    r2Hostname = null;
  }
}

const nextConfig: NextConfig = {
  async headers() {
    const base = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      base.unshift({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
      base.push({
        key: "Content-Security-Policy",
        value: productionContentSecurityPolicy,
      });
    }
    return [{ source: "/:path*", headers: base }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      /** Fal model output / pipeline image URLs (`lib/furniture-gen`, image-gen workspace). */
      {
        protocol: "https",
        hostname: "v3.fal.media",
        pathname: "/**",
      },
      ...(r2Hostname
        ? [
            {
              protocol: "https" as const,
              hostname: r2Hostname,
              pathname: "/**" as const,
            },
          ]
        : []),
    ],
    qualities: [75, 90, 100],
    /** Cache optimized images for 1h — avoids re-processing on every request (cost + latency). */
    minimumCacheTTL: 3600,
  },
};

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryOptions));
