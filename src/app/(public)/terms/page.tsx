import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";
import { PUBLIC_PAGE_SEO, publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: PUBLIC_PAGE_SEO.terms.title,
  description: PUBLIC_PAGE_SEO.terms.description,
  path: PUBLIC_PAGE_SEO.terms.path,
});

export default function TermsPage() {
  return <LegalArticle page={LEGAL_PAGES.terms} />;
}
