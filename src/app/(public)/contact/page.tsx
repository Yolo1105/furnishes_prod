import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";
import { PUBLIC_PAGE_SEO, publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: PUBLIC_PAGE_SEO.contact.title,
  description: PUBLIC_PAGE_SEO.contact.description,
  path: PUBLIC_PAGE_SEO.contact.path,
});

export default function ContactPage() {
  return <LegalArticle page={LEGAL_PAGES.contact} />;
}
