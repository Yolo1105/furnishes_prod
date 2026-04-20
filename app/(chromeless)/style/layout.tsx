import type { Metadata } from "next";
import { StyleExplorerRouteShell } from "@/components/site/StyleExplorerRouteShell";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Style Explorer | ${SITE_TITLE}`,
  description:
    "Curated looks, materials, and moods. Discover your interior style through an interactive flow.",
};

export default function StyleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StyleExplorerRouteShell>{children}</StyleExplorerRouteShell>;
}
