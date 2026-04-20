import type { Metadata } from "next";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Collections | ${SITE_TITLE}`,
  description:
    "Curated furniture and pieces for considered living. Browse by room, category, and style.",
};

export default function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
