import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Signing In",
  robots: NOINDEX_ROBOTS,
};

export default function SsoCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
