import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { adminGetSupportThread } from "@/lib/site/support/store";
import { AdminSupportThreadView } from "./view";

/**
 * /admin/support/[id] — staff view of a thread, with reply form.
 */
export default async function AdminThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await adminGetSupportThread(id);

  if (!thread) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <h1
          className="font-display text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Thread not found
        </h1>
        <p
          className="font-body mt-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Reference: {id}
        </p>
        <Link
          href="/admin/support"
          className="font-ui mt-6 inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-80"
          style={{
            color: "var(--foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to inbox
        </Link>
      </div>
    );
  }

  return <AdminSupportThreadView thread={thread} />;
}
