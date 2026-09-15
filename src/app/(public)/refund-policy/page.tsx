import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";
import { PUBLIC_PAGE_SEO, publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: PUBLIC_PAGE_SEO.refunds.title,
  description: PUBLIC_PAGE_SEO.refunds.description,
  path: PUBLIC_PAGE_SEO.refunds.path,
});

export default function RefundPolicyPage() {
  return <LegalArticle page={LEGAL_PAGES.refunds} />;
}
