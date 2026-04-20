import type { Metadata } from "next";
import Link from "next/link";
import { SITE_TITLE } from "@/content/site/site";

export const metadata: Metadata = {
  title: `Shared brief | ${SITE_TITLE}`,
  description:
    "Read-only design preferences shared from the Furnishes assistant.",
  robots: { index: false, follow: false },
};

export default function SharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 flex min-h-full flex-col">
      <header className="border-border bg-background/80 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 text-sm">
          <Link
            href="/"
            className="text-foreground font-medium hover:underline"
          >
            {SITE_TITLE}
          </Link>
          <span className="text-muted-foreground">Shared link</span>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
