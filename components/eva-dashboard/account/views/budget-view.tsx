"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sofa,
  Bed,
  UtensilsCrossed,
  Lamp,
  ChefHat,
  Droplet,
  Home,
  PiggyBank,
  Plus,
  Trash2,
  Check,
  Info,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { formatSGD } from "@/lib/site/money";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  Field,
  TextInput,
  Button,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { saveBudgetAction } from "@/lib/actions/budget";
import type { AccountBudgetSnapshot } from "@/lib/site/account/server/budget";

type Allocation = {
  id: string;
  room: string;
  roomType: keyof typeof ROOM_ICONS;
  amountCents: number;
  covers: string[];
};

const ROOM_ICONS: Record<string, LucideIcon> = {
  living: Sofa,
  bedroom: Bed,
  dining: UtensilsCrossed,
  kitchen: ChefHat,
  bathroom: Droplet,
  study: Lamp,
  other: Home,
};

const ROOM_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const BENCHMARKS = [
  { label: "Living room sofa (condo)", range: "SGD 2,500 – 6,000" },
  { label: "Bedroom bed + mattress (queen)", range: "SGD 1,800 – 4,500" },
  { label: "Dining table (6-seater)", range: "SGD 1,200 – 3,500" },
  { label: "Wardrobe (2-door)", range: "SGD 1,500 – 4,000" },
  { label: "Rug (200×300cm)", range: "SGD 800 – 2,400" },
  { label: "Lighting (room set)", range: "SGD 400 – 1,500" },
];

function inferRoomType(room: string): keyof typeof ROOM_ICONS {
  const r = room.toLowerCase();
  if (r.includes("living")) return "living";
  if (r.includes("bed") || r.includes("primary")) return "bedroom";
  if (r.includes("dining")) return "dining";
  if (r.includes("kitchen")) return "kitchen";
  if (r.includes("bath")) return "bathroom";
  if (r.includes("study") || r.includes("office")) return "study";
  return "other";
}

function snapshotToAllocations(s: AccountBudgetSnapshot | null): Allocation[] {
  if (!s || s.rooms.length === 0) return [];
  return s.rooms.map((r) => ({
    id: r.id,
    room: r.room,
    roomType: inferRoomType(r.room),
    amountCents: r.allocationCents,
    covers: [] as string[],
  }));
}

export function BudgetView({
  initial,
}: {
  initial: AccountBudgetSnapshot | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [minCents, setMinCents] = useState(initial?.minCents ?? 0);
  const [maxCents, setMaxCents] = useState(initial?.maxCents ?? 0);
  const [currency] = useState(initial?.currency ?? "SGD");
  const [allocations, setAllocations] = useState<Allocation[]>(() =>
    snapshotToAllocations(initial),
  );

  const { toast } = useToast();

  const persist = () => {
    startTransition(async () => {
      const total = allocations.reduce((s, a) => s + a.amountCents, 0);
      const rooms = allocations.map((a) => ({
        room: a.room.trim() || "Room",
        allocationCents: a.amountCents,
        percentage:
          total > 0 ? Math.round((a.amountCents / total) * 1000) / 10 : 0,
      }));
      const res = await saveBudgetAction({
        minCents,
        maxCents,
        currency,
        rooms,
      });
      if (!res.ok) {
        toast.error("Could not save budget.");
        return;
      }
      toast.success("Budget saved");
      router.refresh();
    });
  };

  const totalAllocated = allocations.reduce((s, a) => s + a.amountCents, 0);

  const addRoom = () => {
    setAllocations((prev) => [
      ...prev,
      {
        id: `a${Date.now()}`,
        room: "New room",
        roomType: "other",
        amountCents: 50_000,
        covers: [],
      },
    ]);
  };

  const updateAllocation = (id: string, patch: Partial<Allocation>) => {
    setAllocations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  };

  const removeAllocation = (id: string) => {
    setAllocations((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-6 sm:px-8 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="BUDGET"
        title="Where your money goes"
        subtitle="Share a range and break it out per room. Eva filters every recommendation against this."
        actions={
          <Button
            variant="primary"
            disabled={pending}
            onClick={persist}
            icon={<Check className="h-3.5 w-3.5" />}
          >
            Save changes
          </Button>
        }
      />

      <PreviewBanner />

      {/* ── Hero — two-column: range + visual allocation ────── */}
      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left — total range */}
        <article
          className="border p-6 md:p-8"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>TOTAL RANGE</Eyebrow>
          <div
            className="font-display mt-4 text-[32px] md:text-[36px]"
            style={{ color: "var(--foreground)" }}
          >
            {formatSGD(minCents)}
            <span
              style={{ color: "var(--muted-foreground)" }}
              className="mx-2 text-2xl"
            >
              –
            </span>
            {formatSGD(maxCents)}
          </div>
          <p
            className="font-body mt-2 max-w-md text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Your range filters every piece Collections shows you. Eva respects
            this ceiling — she won't suggest things you can't afford.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Field label="Minimum (SGD)" htmlFor="budget-min">
              <TextInput
                id="budget-min"
                type="number"
                value={Math.floor(minCents / 100)}
                onChange={(e) =>
                  setMinCents(Math.max(0, Number(e.target.value)) * 100)
                }
                step={100}
              />
            </Field>
            <Field label="Maximum (SGD)" htmlFor="budget-max">
              <TextInput
                id="budget-max"
                type="number"
                value={Math.floor(maxCents / 100)}
                onChange={(e) =>
                  setMaxCents(Math.max(0, Number(e.target.value)) * 100)
                }
                step={100}
              />
            </Field>
          </div>
        </article>

        {/* Right — vertical stacked bar showing allocation */}
        <article
          className="border p-6"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Eyebrow>ALLOCATION</Eyebrow>
          <p
            className="font-body mt-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            How the budget breaks down per room.
          </p>

          <div className="mt-4 flex gap-4">
            {/* Vertical stacked bar */}
            <div
              className="flex flex-col border"
              style={{
                width: 48,
                height: 260,
                background: "var(--card-soft)",
                borderColor: "var(--border)",
              }}
            >
              {allocations.map((a, i) => {
                const pct =
                  totalAllocated > 0
                    ? (a.amountCents / totalAllocated) * 100
                    : 0;
                return (
                  <div
                    key={a.id}
                    className="w-full transition-opacity hover:opacity-80"
                    style={{
                      height: `${pct}%`,
                      background: ROOM_COLORS[i % ROOM_COLORS.length],
                    }}
                    title={`${a.room}: ${pct.toFixed(0)}%`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <ul className="flex-1 space-y-2">
              {allocations.map((a, i) => {
                const pct =
                  totalAllocated > 0
                    ? (a.amountCents / totalAllocated) * 100
                    : 0;
                return (
                  <li key={a.id} className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{
                        background: ROOM_COLORS[i % ROOM_COLORS.length],
                      }}
                    />
                    <span
                      className="font-body min-w-0 flex-1 truncate text-xs"
                      style={{ color: "var(--foreground)" }}
                    >
                      {a.room}
                    </span>
                    <span
                      className="font-ui text-[10px] tabular-nums"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </article>
      </section>

      {/* ── Per-room allocation rows + benchmarks sidebar ───── */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        {/* Rows */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>PER ROOM</Eyebrow>
            <Button
              variant="secondary"
              size="sm"
              onClick={addRoom}
              icon={<Plus className="h-3 w-3" />}
            >
              Add room
            </Button>
          </div>

          <div className="space-y-3">
            {allocations.map((a, i) => (
              <AllocationRow
                key={a.id}
                allocation={a}
                color={ROOM_COLORS[i % ROOM_COLORS.length]!}
                totalAllocated={totalAllocated}
                onUpdate={(patch) => updateAllocation(a.id, patch)}
                onRemove={() => removeAllocation(a.id)}
              />
            ))}
          </div>
        </div>

        {/* Benchmarks sidebar */}
        <aside className="space-y-4">
          <SectionCard padding="lg" tone="soft">
            <Eyebrow>SG BENCHMARKS</Eyebrow>
            <p
              className="font-body mt-2 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Typical Singapore ranges from the Furnishes catalog. Eva flags
              when your allocations are way outside these.
            </p>
            <ul
              className="mt-4 space-y-2 border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              {BENCHMARKS.map((b) => (
                <li
                  key={b.label}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span
                    className="font-body text-xs"
                    style={{ color: "var(--foreground)" }}
                  >
                    {b.label}
                  </span>
                  <span
                    className="font-ui shrink-0 text-[10px] tabular-nums"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {b.range}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Link to projects */}
          <SectionCard padding="lg">
            <Eyebrow>LINK TO PROJECTS</Eyebrow>
            <p
              className="font-body mt-2 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Assign this budget to a specific project so Eva respects it per
              workspace.
            </p>
            <Link
              href="/account/projects"
              className="font-ui mt-3 inline-flex items-center gap-1 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
              style={{ color: "var(--primary)" }}
            >
              Go to projects
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </SectionCard>
        </aside>
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */

function AllocationRow({
  allocation,
  color,
  totalAllocated,
  onUpdate,
  onRemove,
}: {
  allocation: Allocation;
  color: string;
  totalAllocated: number;
  onUpdate: (patch: Partial<Allocation>) => void;
  onRemove: () => void;
}) {
  const Icon = ROOM_ICONS[allocation.roomType] ?? Home;
  const pct =
    totalAllocated > 0 ? (allocation.amountCents / totalAllocated) * 100 : 0;

  return (
    <article
      className="border p-4"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center border"
            style={{
              background: "var(--input)",
              borderColor: "var(--border)",
              color,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <input
              value={allocation.room}
              onChange={(e) => onUpdate({ room: e.target.value })}
              className="font-ui w-full bg-transparent text-sm outline-none"
              style={{ color: "var(--foreground)" }}
            />
            {allocation.covers.length > 0 && (
              <p
                className="font-body mt-0.5 truncate text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                Covers: {allocation.covers.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="font-ui border px-2 py-0.5 text-[10px] tabular-nums"
            style={{
              background: "var(--accent-soft)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          >
            {pct.toFixed(0)}%
          </span>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove"
            className="inline-flex h-7 w-7 items-center justify-center transition-colors hover:text-[var(--destructive)]"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Amount input + visual bar */}
      <div className="mt-3">
        <div className="flex items-center gap-3">
          <span
            className="font-ui text-[10px] tabular-nums"
            style={{ color: "var(--muted-foreground)" }}
          >
            SGD
          </span>
          <TextInput
            type="number"
            value={Math.floor(allocation.amountCents / 100)}
            onChange={(e) =>
              onUpdate({
                amountCents: Math.max(0, Number(e.target.value)) * 100,
              })
            }
            className="h-8 w-32"
          />
          <div
            className="relative h-2 flex-1 overflow-hidden"
            style={{ background: "var(--card-soft)" }}
          >
            <div
              className="absolute inset-y-0 left-0 transition-all"
              style={{ width: `${Math.min(100, pct)}%`, background: color }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
