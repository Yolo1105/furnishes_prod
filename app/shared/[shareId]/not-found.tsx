import Link from "next/link";

import { SITE_TITLE } from "@/content/site/site";

export default function SharedNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <p className="text-muted-foreground max-w-md text-center text-sm">
        This shared brief wasn&apos;t found or has expired.
      </p>
      <Link
        href="/chatbot"
        className="text-primary text-sm font-medium underline underline-offset-2 hover:opacity-90"
      >
        Open assistant
      </Link>
      <p className="text-muted-foreground text-center text-xs">
        Created with {SITE_TITLE}
      </p>
    </div>
  );
}
