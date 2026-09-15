import type { Metadata, MetadataRoute } from "next";
import { routes } from "@/lib/contracts/routes";
import { resolvedPublicOrigin } from "@/server/app-origin";

export const SITE_NAME = "Furnishes";
export const SITE_TITLE = "Furnishes | Interior Design Studio";
export const SITE_DESCRIPTION =
  "Furnishes is an interior design studio for modern living. Concept, planning, and 3D visualization that turn clear plans into calm, lasting spaces.";
export const SITE_EMAIL = "hello@furnish-es.com";

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false, noimageindex: true },
} as const satisfies Metadata["robots"];

export const INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
} as const satisfies Metadata["robots"];

/** Private app surfaces that must stay out of the index even when SEO is on. */
export const PRIVATE_ROBOTS_DISALLOW = [
  "/account",
  "/api/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/sso-callback",
  "/shared",
] as const;

export function isIndexingEnabled(
  env: NodeJS.Dict<string | undefined> = process.env,
): boolean {
  return env.NEXT_PUBLIC_ALLOW_INDEXING === "1";
}

export function siteRobots(
  env: NodeJS.Dict<string | undefined> = process.env,
): Metadata["robots"] {
  return isIndexingEnabled(env) ? INDEX_ROBOTS : NOINDEX_ROBOTS;
}

export function publicSiteOrigin(
  env: NodeJS.Dict<string | undefined> = process.env,
): string {
  const origin = (
    env.PUBLIC_APP_URL?.trim() ||
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    resolvedPublicOrigin(env)
  ).replace(/\/$/, "");
  return origin;
}

export function publicPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
}): Metadata {
  const displayTitle = input.absoluteTitle
    ? input.title
    : `${input.title} | ${SITE_NAME}`;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: displayTitle,
      description: input.description,
      url: input.path,
      type: "website",
      locale: "en_SG",
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description: input.description,
    },
  };
}

export const PUBLIC_PAGE_SEO = {
  home: {
    path: routes.home,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  quiz: {
    path: routes.quiz,
    title: "Design Quiz",
    description:
      "A short design quiz to clarify your space, style, and budget before Furnishes plans a modern interior.",
  },
  contact: {
    path: routes.contact,
    title: "Contact Us",
    description:
      "Email Furnishes at hello@furnish-es.com. Interior design studio for modern living, Monday to Friday 10:00–18:00 SGT.",
  },
  terms: {
    path: routes.terms,
    title: "Terms & Conditions",
    description:
      "Terms of use for the Furnishes website and studio account, including orders, acceptable use, and account responsibilities.",
  },
  privacy: {
    path: routes.privacy,
    title: "Privacy Policy",
    description:
      "How Furnishes collects, uses, and deletes personal data for accounts, conversations, and orders.",
  },
  refunds: {
    path: routes.refunds,
    title: "Refund Policy",
    description:
      "Furnishes refund policy for studio orders. Unpaid orders can be cancelled in your account; paid refunds go through hello@furnish-es.com.",
  },
} as const;

export function buildRobots(
  env: NodeJS.Dict<string | undefined> = process.env,
): MetadataRoute.Robots {
  if (!isIndexingEnabled(env)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const origin = publicSiteOrigin(env);
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_ROBOTS_DISALLOW],
    },
    ...(origin ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}

export function buildSitemap(
  env: NodeJS.Dict<string | undefined> = process.env,
  now = new Date(),
): MetadataRoute.Sitemap {
  if (!isIndexingEnabled(env)) return [];
  const origin = publicSiteOrigin(env);
  if (!origin) return [];

  const pages: Array<{
    path: string;
    changeFrequency: NonNullable<
      MetadataRoute.Sitemap[number]["changeFrequency"]
    >;
    priority: number;
  }> = [
    { path: routes.home, changeFrequency: "weekly", priority: 1 },
    { path: routes.quiz, changeFrequency: "monthly", priority: 0.8 },
    { path: routes.contact, changeFrequency: "monthly", priority: 0.7 },
    { path: routes.terms, changeFrequency: "yearly", priority: 0.3 },
    { path: routes.privacy, changeFrequency: "yearly", priority: 0.3 },
    { path: routes.refunds, changeFrequency: "yearly", priority: 0.3 },
  ];

  return pages.map((page) => ({
    url: `${origin}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

export function siteJsonLd(origin: string) {
  const id = `${origin}/#studio`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": id,
        name: SITE_NAME,
        url: origin,
        email: SITE_EMAIL,
        description: SITE_DESCRIPTION,
        image: `${origin}/opengraph-image`,
        areaServed: {
          "@type": "Country",
          name: "Singapore",
        },
        serviceType: "Interior design",
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": id },
        inLanguage: "en-SG",
      },
    ],
  };
}
