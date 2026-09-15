import { describe, expect, it } from "vitest";
import {
  PRIVATE_ROBOTS_DISALLOW,
  PUBLIC_PAGE_SEO,
  buildRobots,
  buildSitemap,
  isIndexingEnabled,
  publicPageMetadata,
  publicSiteOrigin,
  siteJsonLd,
} from "./seo";

describe("isIndexingEnabled", () => {
  it("defaults off", () => {
    expect(isIndexingEnabled({})).toBe(false);
  });

  it("turns on only for 1", () => {
    expect(isIndexingEnabled({ NEXT_PUBLIC_ALLOW_INDEXING: "1" })).toBe(true);
    expect(isIndexingEnabled({ NEXT_PUBLIC_ALLOW_INDEXING: "true" })).toBe(
      false,
    );
  });
});

describe("buildRobots", () => {
  it("blocks the whole site when indexing is off", () => {
    expect(buildRobots({})).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });

  it("allows public pages and keeps account, auth, and APIs out", () => {
    const robots = buildRobots({
      NEXT_PUBLIC_ALLOW_INDEXING: "1",
      APP_ORIGIN: "https://furnish-es.com",
    });
    expect(robots.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_ROBOTS_DISALLOW],
    });
    expect(robots.sitemap).toBe("https://furnish-es.com/sitemap.xml");
  });
});

describe("buildSitemap", () => {
  it("is empty while indexing is off", () => {
    expect(buildSitemap({ APP_ORIGIN: "https://furnish-es.com" })).toEqual([]);
  });

  it("lists public marketing routes with home first", () => {
    const now = new Date("2026-09-14T00:00:00.000Z");
    const urls = buildSitemap(
      {
        NEXT_PUBLIC_ALLOW_INDEXING: "1",
        APP_ORIGIN: "https://furnish-es.com/",
      },
      now,
    );
    expect(urls.map((entry) => entry.url)).toEqual([
      "https://furnish-es.com/",
      "https://furnish-es.com/quiz",
      "https://furnish-es.com/contact",
      "https://furnish-es.com/terms",
      "https://furnish-es.com/privacy-policy",
      "https://furnish-es.com/refund-policy",
    ]);
    expect(urls[0]).toMatchObject({
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    });
  });
});

describe("publicPageMetadata", () => {
  it("sets canonical and social titles for a nested page", () => {
    const meta = publicPageMetadata({
      title: PUBLIC_PAGE_SEO.quiz.title,
      description: PUBLIC_PAGE_SEO.quiz.description,
      path: PUBLIC_PAGE_SEO.quiz.path,
    });
    expect(meta.alternates).toEqual({ canonical: "/quiz" });
    expect(meta.openGraph?.title).toBe("Design Quiz | Furnishes");
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("publicSiteOrigin", () => {
  it("prefers PUBLIC_APP_URL then APP_ORIGIN", () => {
    expect(
      publicSiteOrigin({
        PUBLIC_APP_URL: "https://www.furnish-es.com/",
        APP_ORIGIN: "https://furnish-es.com",
      }),
    ).toBe("https://www.furnish-es.com");
  });
});

describe("siteJsonLd", () => {
  it("describes the studio and the site", () => {
    const graph = siteJsonLd("https://furnish-es.com")["@graph"];
    expect(graph[0]).toMatchObject({
      "@type": "ProfessionalService",
      email: "hello@furnish-es.com",
      name: "Furnishes",
    });
    expect(graph[1]).toMatchObject({
      "@type": "WebSite",
      inLanguage: "en-SG",
    });
  });
});
