"use client";

import { useState } from "react";
import { Plus, CreditCard, QrCode, Star, Trash2, Shield } from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  EmptyState,
  Button,
  ConfirmDialog,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { ProfileTabNav } from "../profile-tab-nav";
import { getMockPaymentMethods } from "@/lib/site/commerce/mock-data";
import type { PaymentMethod } from "@/lib/site/commerce/types";

export function PaymentMethodsView() {
  const [methods, setMethods] = useState<PaymentMethod[]>(
    getMockPaymentMethods(),
  );
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { toast } = useToast();

  const setDefault = (id: string) => {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    toast.success("Default payment updated");
  };

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="PAYMENT"
        title="How you pay"
        subtitle="Saved cards are tokenized via Stripe — we never store raw card numbers."
        actions={
          <Button
            variant="primary"
            onClick={() => toast.info("Stripe Elements will open here")}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add method
          </Button>
        }
      />

      <PreviewBanner />

      <ProfileTabNav />

      {methods.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment methods"
          body="Add one and it'll be available during checkout."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {methods.map((m) => (
            <SectionCard key={m.id} padding="lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="inline-flex h-10 w-14 items-center justify-center border"
                    style={{
                      background: "var(--muted)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    {m.kind === "card" ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div
                      className="font-ui text-sm"
                      style={{ color: "var(--foreground)" }}
                    >
                      {m.kind === "card"
                        ? `${m.brand?.toUpperCase()} ···· ${m.last4}`
                        : "PayNow"}
                    </div>
                    <div
                      className="font-body text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {m.kind === "card"
                        ? `Expires ${m.expMonth?.toString().padStart(2, "0")}/${m.expYear}`
                        : "Transfer via bank app"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDel(m.id)}
                  aria-label="Remove"
                  className="inline-flex h-7 w-7 items-center justify-center transition-colors hover:text-[var(--destructive)]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                className="mt-4 flex items-center justify-between border-t pt-3"
                style={{ borderColor: "var(--border)" }}
              >
                {m.isDefault ? (
                  <span
                    className="font-ui inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase"
                    style={{ color: "var(--primary)" }}
                  >
                    <Star className="h-3 w-3" />
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDefault(m.id)}
                    className="font-ui text-[10px] tracking-[0.18em] uppercase hover:underline"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Set as default
                  </button>
                )}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <SectionCard padding="lg" tone="muted" className="mt-6">
        <div className="flex items-start gap-3">
          <Shield
            className="mt-1 h-4 w-4"
            style={{ color: "var(--primary)" }}
          />
          <div>
            <h4
              className="font-ui text-sm"
              style={{ color: "var(--foreground)" }}
            >
              Your cards are never on our servers
            </h4>
            <p
              className="font-body mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              We use Stripe (PCI-DSS certified) for all card processing. Only
              the last 4 digits and expiry are stored in your Furnishes account
              — enough to recognize the card, never enough to use it.
            </p>
          </div>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) {
            setMethods((prev) => prev.filter((m) => m.id !== confirmDel));
            toast.info("Payment method removed");
          }
        }}
        title="Remove this payment method?"
        body="You'll be asked to re-add it if needed during checkout."
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
