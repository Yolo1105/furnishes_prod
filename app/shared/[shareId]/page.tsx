import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { SITE_TITLE } from "@/content/site/site";
import { prisma } from "@/lib/eva/db";

const loadSharedBrief = cache(async (shareId: string) => {
  const shared = await prisma.sharedProject.findUnique({
    where: { shareId },
    include: { conversation: true },
  });
  if (!shared) return null;
  if (shared.expiresAt && shared.expiresAt < new Date()) return null;
  const prefs = await prisma.preference.findMany({
    where: { conversationId: shared.conversationId },
  });
  const preferences: Record<string, string> = {};
  for (const p of prefs) preferences[p.field] = p.value;
  const summary = shared.conversation.title || "Design brief";
  return { preferences, summary };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareId: string }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const data = await loadSharedBrief(shareId);
  if (!data) {
    return { title: "Shared brief", description: "Shared design brief" };
  }
  return {
    title: data.summary,
    description: "Shared design brief",
  };
}

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const data = await loadSharedBrief(shareId);
  if (!data) notFound();

  const { preferences, summary } = data;
  const entries = Object.entries(preferences).filter(([, v]) => v);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 pb-16">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight">
          {summary}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Shared design brief (read-only)
        </p>
      </div>
      <ul className="grid gap-3">
        {entries.map(([field, value]) => (
          <li
            key={field}
            className="border-border bg-card rounded-lg border px-4 py-3 shadow-sm"
          >
            <p className="text-foreground text-sm font-medium capitalize">
              {field.replace(/([A-Z])/g, " $1").trim()}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{value}</p>
          </li>
        ))}
      </ul>
      {entries.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No preferences in this brief yet.
        </p>
      )}
      <footer className="text-muted-foreground pt-8 text-center text-xs">
        <span>Created with {SITE_TITLE}</span>
        {" · "}
        <Link href="/chatbot" className="hover:text-foreground underline">
          Open assistant
        </Link>
      </footer>
    </div>
  );
}
