import type { MetadataRoute } from "next";
import { routes } from "@/lib/contracts/routes";
import { resolvedPublicOrigin } from "@/server/app-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "1") {
    return [];
  }
  const origin = (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    resolvedPublicOrigin()
  ).replace(/\/$/, "");
  if (!origin) return [];
  const paths = [
    routes.home,
    routes.quiz,
    routes.terms,
    routes.privacy,
    routes.refunds,
    routes.contact,
  ];
  return paths.map((path) => ({
    url: `${origin}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === routes.home ? 1 : 0.6,
  }));
}
