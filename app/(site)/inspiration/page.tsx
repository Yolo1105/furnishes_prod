import type { Metadata } from "next";
import { InspirationPageClient } from "@/components/site/inspiration/inspiration-page-client";

export const metadata: Metadata = {
  title: "Inspiration — Furnishes",
  description:
    "Explore tools and ideas to shape your space — moodboards, layout, and more.",
};

/**
 * Server entry: metadata + HTML shell; Framer Motion and filters live in
 * {@link InspirationPageClient} to keep this route’s default JS bundle smaller
 * for static head content.
 */
export default function InspirationPage() {
  return <InspirationPageClient />;
}
