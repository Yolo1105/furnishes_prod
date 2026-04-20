/**
 * Bracketed uppercase badge for row/item statuses.
 *
 * Variants map to semantic tokens so a single component handles the common
 * statuses across conversations, projects, shortlist, invoices, sessions.
 */

type Variant =
  | "active"
  | "archived"
  | "shared"
  | "draft"
  | "planning"
  | "sourcing"
  | "in_progress"
  | "done"
  | "paid"
  | "due"
  | "refunded"
  | "confirmed"
  | "potential"
  | "ok"
  | "warn"
  | "error"
  | "neutral";

/* Use only classes bridged in account-theme.css under .eva-dashboard-root.
 * (e.g. border-accent/40 and bg-accent/5 are not — border-color fell back to black.) */
const CONFIG: Record<Variant, { label: string; className: string }> = {
  active: {
    label: "ACTIVE",
    className: "text-primary border-border bg-primary/10",
  },
  archived: {
    label: "ARCHIVED",
    className: "text-muted-foreground border-border bg-muted/50",
  },
  shared: {
    label: "SHARED",
    className: "text-foreground border-border bg-card-soft",
  },
  draft: {
    label: "DRAFT",
    className: "text-muted-foreground border-border bg-card",
  },
  planning: {
    label: "PLANNING",
    className: "text-muted-foreground border-border bg-card",
  },
  sourcing: {
    label: "SOURCING",
    className: "text-primary border-border bg-primary/10",
  },
  in_progress: {
    label: "IN PROGRESS",
    className: "text-foreground border-border bg-card-soft",
  },
  done: {
    label: "DONE",
    className: "text-foreground border-border bg-muted/30",
  },
  paid: {
    label: "PAID",
    className: "text-primary border-border bg-primary/10",
  },
  due: {
    label: "DUE",
    className: "text-destructive border-border bg-destructive/5",
  },
  refunded: {
    label: "REFUNDED",
    className: "text-muted-foreground border-border bg-muted/50",
  },
  confirmed: {
    label: "CONFIRMED",
    className: "text-success-foreground border-success-border bg-success",
  },
  potential: {
    label: "POTENTIAL",
    className: "text-review-foreground border-review-border bg-review",
  },
  ok: { label: "OK", className: "text-primary border-border bg-primary/10" },
  warn: {
    label: "WARN",
    className: "text-review-foreground border-review-border bg-review",
  },
  error: {
    label: "ERROR",
    className: "text-destructive border-border bg-destructive/5",
  },
  neutral: {
    label: "",
    className: "text-muted-foreground border-border bg-card",
  },
};

export function StatusBadge({
  variant,
  children,
}: {
  variant: Variant;
  children?: React.ReactNode;
}) {
  const c = CONFIG[variant];
  const label = children ?? c.label;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.18em] uppercase ${c.className}`}
      /* Avoid border picking up `currentColor` from `text-*` (reads as black). */
      style={{ borderColor: "var(--border)" }}
    >
      <span style={{ color: "var(--accent)" }}>[</span>
      {label}
      <span style={{ color: "var(--accent)" }}>]</span>
    </span>
  );
}
