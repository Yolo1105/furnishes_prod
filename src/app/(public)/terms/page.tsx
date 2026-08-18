import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";

export const metadata: Metadata = { title: LEGAL_PAGES.terms.title };

export default function TermsPage() {
  return <LegalArticle page={LEGAL_PAGES.terms} />;
}
