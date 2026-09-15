import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: NOINDEX_ROBOTS,
};

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>This route does not exist.</p>
    </main>
  );
}
