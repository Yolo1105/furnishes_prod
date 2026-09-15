import type { MetadataRoute } from "next";
import { buildRobots } from "@/lib/seo";

/**
 * Indexing is opt-in per environment: set NEXT_PUBLIC_ALLOW_INDEXING=1 at
 * build time when the site goes public. Default (unset) blocks all crawling.
 * When on, account, auth, and API paths stay disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
