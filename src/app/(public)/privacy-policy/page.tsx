import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";

export const metadata: Metadata = { title: LEGAL_PAGES.privacy.title };

export default function PrivacyPolicyPage() {
  return <LegalArticle page={LEGAL_PAGES.privacy} />;
}
