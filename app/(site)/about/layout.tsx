import type { Metadata } from "next";
import { FOOTER_COMPANY_NAME } from "@/content/site/footer-content";

export const metadata: Metadata = {
  title: `About | ${FOOTER_COMPANY_NAME}`,
  description:
    "Learn about Furnishes: our dedication to timeless craftsmanship, thoughtful design, and creating functional interiors.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
