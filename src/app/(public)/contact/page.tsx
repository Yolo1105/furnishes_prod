import type { Metadata } from "next";
import { LegalArticle, LEGAL_PAGES } from "@/features/public/LegalArticle";

export const metadata: Metadata = { title: LEGAL_PAGES.contact.title };

export default function ContactPage() {
  return <LegalArticle page={LEGAL_PAGES.contact} />;
}
