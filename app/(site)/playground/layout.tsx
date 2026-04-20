import type { Metadata } from "next";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Playground | ${SITE_TITLE}`,
  description:
    "An internal space to try layout, motion, and UI experiments before they ship across Furnishes.",
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
