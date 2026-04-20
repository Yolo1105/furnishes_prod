import type { Metadata } from "next";
import { StyleExplorerRouteShell } from "@/components/site/StyleExplorerRouteShell";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Design Quiz | ${SITE_TITLE}`,
  description:
    "Discover your interior style: mood, materials, and palette in a focused design quiz.",
};

export default function DesignQuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StyleExplorerRouteShell>{children}</StyleExplorerRouteShell>;
}
