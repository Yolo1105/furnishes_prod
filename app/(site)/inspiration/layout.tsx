import type { Metadata } from "next";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Inspiration | ${SITE_TITLE}`,
  description:
    "Tools for the thoughtful space. Curated looks, planning, and ideas to shape your home.",
};

export default function InspirationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
