import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";

export const metadata: Metadata = { title: LEGAL_PAGES.refunds.title };

export default function RefundPolicyPage() {
  return <LegalArticle page={LEGAL_PAGES.refunds} />;
}
