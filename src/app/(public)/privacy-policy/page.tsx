import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";
import { PUBLIC_PAGE_SEO, publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: PUBLIC_PAGE_SEO.privacy.title,
  description: PUBLIC_PAGE_SEO.privacy.description,
  path: PUBLIC_PAGE_SEO.privacy.path,
});

export default function PrivacyPolicyPage() {
  return <LegalArticle page={LEGAL_PAGES.privacy} />;
}
