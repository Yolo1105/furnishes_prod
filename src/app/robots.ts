import type { MetadataRoute } from "next";

/**
 * Indexing is opt-in per environment: set NEXT_PUBLIC_ALLOW_INDEXING=1 at
 * build time when the site goes public. Default (unset) blocks all crawling.
 */
export default function robots(): MetadataRoute.Robots {
  const allow = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "1";
  return {
    rules: allow
      ? { userAgent: "*", allow: "/" }
      : { userAgent: "*", disallow: "/" },
  };
}
