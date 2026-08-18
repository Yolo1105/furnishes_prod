"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import {
  DEFAULT_ROOM_ALLOCATIONS,
  type BudgetData,
} from "@/server/account/budget-schema";

const DEFAULT_MINIMUM = 15000;
const DEFAULT_MAXIMUM = 20000;

const HERO_NOTE = "Working budget, within the S$15k–20k range you set.";
const TRACK_PERCENT = 90;
const TRACK_NOTE = "90% of your S$20k ceiling planned";
const SPENT_SO_FAR = "S$8,900";
const REMAINING = "S$9,100";
const DEFAULT_BIG_NUMBER = "S$18,000";
const DEFAULT_RANGE_FACT = "S$15k – 20k";

const BENCHMARKS: Array<{ label: string; value: string }> = [
  { label: "Living room sofa (condo)", value: "S$1,200 – 3,500" },
  { label: "Bedroom bed + mattress (queen)", value: "S$1,500 – 4,000" },
  { label: "Dining table (6-seater)", value: "S$800 – 2,500" },
  { label: "Wardrobe (2-door)", value: "S$600 – 1,800" },
  { label: "Lighting (room set)", value: "S$300 – 1,200" },
  { label: "Rug (200×300cm)", value: "S$250 – 1,500" },
];

function formatSgd(amount: number): string {
  return `S$${amount.toLocaleString("en-US")}`;
}

/**
 * Route-owned Budget page — exact studio markup/classes.
 * Source of truth: approved Account wireframe budget surface.
 */
export function BudgetPage({ initialBudget }: { initialBudget?: BudgetData }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const allocations =
    initialBudget && initialBudget.allocations.length > 0
      ? initialBudget.allocations
      : DEFAULT_ROOM_ALLOCATIONS;
  const maxAmount = Math.max(...allocations.map((room) => room.amount), 1);

  const bigNumber =
    initialBudget?.maximum != null
      ? formatSgd(initialBudget.maximum)
      : DEFAULT_BIG_NUMBER;

  const rangeFact =
    initialBudget?.minimum != null && initialBudget?.maximum != null
      ? `S$${Math.round(initialBudget.minimum / 1000)}k – ${Math.round(
          initialBudget.maximum / 1000,
        )}k`
      : DEFAULT_RANGE_FACT;

  async function handleSave() {
    setStatus("saving");
    try {
      await accountRequest("/api/account/budget", {
        method: "PUT",
        body: JSON.stringify({
          minimum: DEFAULT_MINIMUM,
          maximum: DEFAULT_MAXIMUM,
          currency: "SGD",
          allocations: DEFAULT_ROOM_ALLOCATIONS,
        }),
      });
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1500);
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="How Eva Knows Me"
        title="Where your money goes"
        subtitle="Share a range and break it out per room. Eva filters every recommendation to fit."
        actions={
          <button type="button" className="wf-btn" onClick={handleSave}>
            Save range
          </button>
        }
      />

      <div className="wf-conn">
        <div className="wf-bigstat">
          <span className="wf-bignum">{bigNumber}</span>
        </div>
        <p className="wf-sub" style={{ margin: "10px 0 0", maxWidth: "48ch" }}>
          {HERO_NOTE}
        </p>
        <div
          className="wf-track"
          style={{ marginTop: "18px", maxWidth: "560px" }}
        >
          <i style={{ width: `${TRACK_PERCENT}%` }} />
        </div>
        <p className="wf-tag" style={{ margin: "9px 0 26px" }}>
          {TRACK_NOTE}
        </p>
        <div
          className="wf-facts"
          style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}
        >
          <div className="wf-fact">
            <div className="wf-fact__l">Range</div>
            <div className="wf-fact__v">{rangeFact}</div>
          </div>
          <div className="wf-fact">
            <div className="wf-fact__l">Spent so far</div>
            <div className="wf-fact__v">{SPENT_SO_FAR}</div>
          </div>
          <div className="wf-fact">
            <div className="wf-fact__l">Remaining</div>
            <div className="wf-fact__v">{REMAINING}</div>
          </div>
        </div>

        <p className="wf-sec__lbl" style={{ margin: "42px 0 16px" }}>
          Allocation by room
        </p>
        <div className="wf-alloc">
          {allocations.map((room) => (
            <div className="wf-alloc__row" key={room.name}>
              <div>
                <div className="wf-alloc__name">{room.name}</div>
                <div className="wf-alloc__desc">{room.description}</div>
              </div>
              <div className="wf-alloc__bar">
                <i
                  style={{
                    width: `${Math.min(100, (room.amount / maxAmount) * 100)}%`,
                  }}
                />
              </div>
              <div className="wf-alloc__amt">{formatSgd(room.amount)}</div>
            </div>
          ))}
        </div>

        <p className="wf-sec__lbl" style={{ margin: "42px 0 16px" }}>
          SG benchmarks
        </p>
        <p
          className="wf-sub"
          style={{ margin: "-4px 0 18px", maxWidth: "60ch" }}
        >
          Typical Singapore price ranges, so you can sanity-check each
          allocation.
        </p>
        <div className="wf-bench">
          {BENCHMARKS.map((row) => (
            <div className="wf-bench__row" key={row.label}>
              <span className="wf-bench__l">{row.label}</span>
              <span className="wf-bench__v">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`wf-toast${status === "saved" ? " show" : ""}`}>
        Saved ✓
      </div>
    </AccountWireFrame>
  );
}
