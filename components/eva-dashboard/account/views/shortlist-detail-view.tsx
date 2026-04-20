"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  FolderKanban,
  Share2,
  Trash2,
  Sparkles,
  Ruler,
  Layers,
  ExternalLink,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  Button,
  LinkButton,
  ConfirmDialog,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { removeFromShortlistAction } from "@/lib/actions/shortlist";
import { relativeTime } from "@/lib/site/account/mock-data";
import { formatSGD } from "@/lib/site/money";
import type { ShortlistItemDetail } from "@/lib/site/account/types";

/**
 * /account/shortlist/[id]
 *
 * PDP-style layout:
 *   ┌─────────────────────────────┬───────────────────────────┐
 *   │                              │ [ SHORTLIST ]              │
 *   │    large product image       │ PRODUCT NAME — big display │
 *   │    (gradient placeholder)    │ Category                    │
 *   │                              │ SGD 2,980                   │
 *   │                              │ Materials · Dimensions      │
 *   │                              │ [ open collection ] [heart] │
 *   └─────────────────────────────┴───────────────────────────┘
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ Why Eva flagged it — rationale text block (peachy bg)     │
 *   └─────────────────────────────────────────────────────────┘
 */
export function ShortlistDetailView({ item }: { item: ShortlistItemDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { toast } = useToast();

  const dim =
    item.dimensionsCm.widthCm > 0 ||
    item.dimensionsCm.depthCm > 0 ||
    item.dimensionsCm.heightCm > 0
      ? `W ${item.dimensionsCm.widthCm} × D ${item.dimensionsCm.depthCm} × H ${item.dimensionsCm.heightCm} cm`
      : "—";

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        breadcrumbs={[
          { icon: Heart, label: "Shortlist", href: "/account/shortlist" },
          { label: item.productName },
        ]}
        title={item.productName}
        subtitle={item.productCategory}
      />

      <div className="mt-2 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Product image */}
        <div
          className="aspect-[4/5] w-full border"
          style={{
            borderColor: "var(--border)",
            background: `linear-gradient(135deg, oklch(0.88 0.08 ${item.coverHue}) 0%, oklch(0.58 0.14 ${item.coverHue}) 100%)`,
          }}
          aria-label="Product image"
        />

        {/* Product info */}
        <div
          className="flex flex-col border p-6 md:p-8"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <Eyebrow>{item.productCategory.toUpperCase()}</Eyebrow>
            {item.projectName && item.projectId && (
              <Link
                href={`/account/projects/${item.projectId}`}
                className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
                style={{ color: "var(--primary)" }}
              >
                <FolderKanban className="h-3 w-3" />
                {item.projectName}
              </Link>
            )}
          </div>

          <div
            className="mt-3 text-2xl font-[var(--font-manrope)] tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {formatSGD(item.priceCents)}
          </div>

          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--foreground)" }}
          >
            {item.description}
          </p>

          {/* Specs */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className="border p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Ruler className="h-3 w-3" />
                Dimensions
              </div>
              <div
                className="mt-1.5 font-mono text-sm tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {dim}
              </div>
            </div>
            <div
              className="border p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Layers className="h-3 w-3" />
                Materials
              </div>
              <ul
                className="mt-1.5 space-y-0.5 text-xs"
                style={{ color: "var(--foreground)" }}
              >
                {item.materials.map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => toast.success("Opening in Collections…")}
              icon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              View in Collections
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info("Move flow")}
              icon={<FolderKanban className="h-3.5 w-3.5" />}
            >
              Move to project
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.success("Share link copied")}
              icon={<Share2 className="h-3.5 w-3.5" />}
            >
              Share
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmRemove(true)}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Remove
            </Button>
          </div>

          <div
            className="mt-5 flex items-center gap-2 border-t pt-4 text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <Heart className="h-3 w-3" style={{ color: "var(--primary)" }} />
            Saved {relativeTime(item.createdAt)}
          </div>
        </div>
      </div>

      {/* Eva's rationale */}
      <SectionCard padding="lg" tone="muted" className="mt-5">
        <div className="flex items-start gap-3">
          <div
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border"
            style={{
              background: "var(--primary)",
              borderColor: "var(--border)",
              color: "var(--primary-foreground)",
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <Eyebrow>WHY EVA FLAGGED IT</Eyebrow>
            <p
              className="mt-2 text-sm leading-[1.7]"
              style={{ color: "var(--foreground)" }}
            >
              {item.rationale}
            </p>
          </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          startTransition(async () => {
            const res = await removeFromShortlistAction(item.id);
            if (res.ok) {
              setConfirmRemove(false);
              toast.success("Removed from shortlist");
              router.push("/account/shortlist");
              router.refresh();
            } else {
              toast.error(res.error);
            }
          });
        }}
        title="Remove from shortlist?"
        body="The piece stays available in Collections — this just clears it from your saved list."
        confirmLabel={isPending ? "Removing…" : "Remove"}
        destructive
      />
    </div>
  );
}
