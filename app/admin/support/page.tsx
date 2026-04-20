import Link from "next/link";
import { adminListSupportThreads } from "@/lib/site/support/store";
import { relativeTime } from "@/lib/site/time";
import {
  supportStatusVariant,
  supportStatusLabel,
} from "@/lib/site/support/status";

type Search = {
  status?: string;
  kind?: string;
};

/**
 * /admin/support — inbox view. Lists all open support threads across
 * all users, sorted newest-first. Click a row to enter the thread.
 *
 * Filter via URL params:
 *   ?status=all_open  (default)
 *   ?status=open
 *   ?status=awaiting_user
 *   ?status=all
 *   ?kind=HELP
 *   ?kind=FEEDBACK
 */
export default async function AdminSupportInboxPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const status = (params.status ?? "all_open") as
    | "all_open"
    | "all"
    | "open"
    | "awaiting_user"
    | "received"
    | "under_review";
  const kind = params.kind as "HELP" | "FEEDBACK" | undefined;

  const { threads } = await adminListSupportThreads({
    status,
    kind,
    limit: 50,
  });

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <div className="mb-6">
        <p
          className="font-ui text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--muted-foreground)" }}
        >
          [ ADMIN ]
        </p>
        <h1
          className="font-display mt-2 text-3xl"
          style={{ color: "var(--foreground)" }}
        >
          Support inbox
        </h1>
        <p
          className="font-body mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {threads.length} thread{threads.length === 1 ? "" : "s"} ·{" "}
          {status === "all_open"
            ? "Open only"
            : status === "all"
              ? "All statuses"
              : status}
        </p>
      </div>

      {/* Filters */}
      <div
        className="mb-5 flex flex-wrap items-center gap-2 border-y py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <FilterPill
          href="/admin/support?status=all_open"
          active={status === "all_open" && !kind}
          label="Open"
        />
        <FilterPill
          href="/admin/support?status=all_open&kind=HELP"
          active={status === "all_open" && kind === "HELP"}
          label="Help only"
        />
        <FilterPill
          href="/admin/support?status=all_open&kind=FEEDBACK"
          active={status === "all_open" && kind === "FEEDBACK"}
          label="Feedback only"
        />
        <FilterPill
          href="/admin/support?status=awaiting_user"
          active={status === "awaiting_user"}
          label="Awaiting user"
        />
        <FilterPill
          href="/admin/support?status=all"
          active={status === "all"}
          label="All statuses"
        />
      </div>

      {/* Thread list */}
      {threads.length === 0 ? (
        <div
          className="border p-12 text-center"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="font-body text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No threads match these filters.
          </p>
        </div>
      ) : (
        <div
          className="divide-border divide-y border"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/admin/support/${t.id}`}
              className="block px-5 py-4 transition-colors hover:bg-[var(--card-soft)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-ui font-mono text-[10.5px] tracking-[0.06em]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {t.number}
                    </span>
                    <span
                      className="font-ui text-[10px] tracking-[0.16em] uppercase"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {t.kind} · {t.category}
                    </span>
                    <StatusChip status={t.status} />
                  </div>
                  <h3
                    className="font-display mt-1 text-base"
                    style={{ color: "var(--foreground)" }}
                  >
                    {t.title}
                  </h3>
                  <p
                    className="font-body mt-1 line-clamp-1 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.body}
                  </p>
                  <p
                    className="font-ui mt-2 text-[10.5px] tracking-[0.06em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.userName ?? "—"} · {t.userEmail}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className="font-ui text-[10.5px] tabular-nums"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {relativeTime(t.updatedAt)}
                  </span>
                  <p
                    className="font-ui mt-1 text-[10px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {t.messages.length} msg
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="font-ui border px-3 py-1.5 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-80"
      style={{
        color: active ? "var(--primary-foreground)" : "var(--foreground)",
        background: active ? "var(--primary)" : "transparent",
        borderColor: active ? "var(--primary)" : "var(--border-strong)",
      }}
    >
      {label}
    </Link>
  );
}

function StatusChip({ status }: { status: string }) {
  const variant = supportStatusVariant(
    status as Parameters<typeof supportStatusVariant>[0],
  );
  const colors: Record<string, { bg: string; fg: string; bd: string }> = {
    active: {
      bg: "rgba(180,68,42,0.08)",
      fg: "var(--primary)",
      bd: "rgba(180,68,42,0.2)",
    },
    warn: {
      bg: "rgba(180,140,40,0.08)",
      fg: "#9a6f1c",
      bd: "rgba(180,140,40,0.2)",
    },
    ok: {
      bg: "rgba(40,120,60,0.08)",
      fg: "#2c7a3a",
      bd: "rgba(40,120,60,0.2)",
    },
    archived: {
      bg: "rgba(43,31,24,0.06)",
      fg: "var(--muted-foreground)",
      bd: "var(--border-strong)",
    },
  };
  const c = colors[variant] ?? colors.active!;
  return (
    <span
      className="font-ui border px-1.5 py-0.5 text-[9.5px] tracking-[0.16em] uppercase"
      style={{ color: c.fg, background: c.bg, borderColor: c.bd }}
    >
      {supportStatusLabel(status as Parameters<typeof supportStatusLabel>[0])}
    </span>
  );
}
