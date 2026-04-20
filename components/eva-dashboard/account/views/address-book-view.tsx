"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Home as HomeIcon,
  Briefcase,
  MapPin,
  Star,
  Edit3,
  Trash2,
  Check,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  EmptyState,
  Button,
  RightInspector,
  Field,
  TextInput,
  Select,
  Toggle,
  ConfirmDialog,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { ProfileTabNav } from "../profile-tab-nav";
import { ACCOUNT_ADDRESS_LIMIT } from "@/lib/commerce/constants";
import { formatAddressPostalLine } from "@/lib/commerce/region";
import type { Address } from "@/lib/site/commerce/types";

const ICON_BY_LABEL = {
  Home: HomeIcon,
  Work: Briefcase,
  Other: MapPin,
};

export function AddressBookView() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    const res = await fetch("/api/account/addresses");
    if (!res.ok) {
      setAddresses([]);
      return;
    }
    const data = (await res.json()) as { addresses: Address[] };
    setAddresses(data.addresses);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch(() => {
        if (!cancelled) setAddresses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const startNew = () => {
    setEditing({
      id: `new-${Date.now()}`,
      label: "Home",
      recipientName: "",
      phone: "",
      postalCode: "",
      street: "",
      unit: "",
      landmark: "",
      isDefault: addresses.length === 0,
      hasLiftAccess: true,
    });
  };

  const save = async (a: Address) => {
    const isNew = a.id.startsWith("new-");
    try {
      if (isNew) {
        const res = await fetch("/api/account/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: a.label,
            recipientName: a.recipientName,
            phone: a.phone,
            postalCode: a.postalCode,
            street: a.street,
            unit: a.unit,
            landmark: a.landmark,
            hasLiftAccess: a.hasLiftAccess ?? true,
            isDefault: a.isDefault,
          }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          toast.error(data.message ?? "Could not save address");
          return;
        }
      } else {
        const res = await fetch(`/api/account/addresses/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: a.label,
            recipientName: a.recipientName,
            phone: a.phone,
            postalCode: a.postalCode,
            street: a.street,
            unit: a.unit,
            landmark: a.landmark,
            hasLiftAccess: a.hasLiftAccess,
            isDefault: a.isDefault,
          }),
        });
        const data = (await res.json()) as { message?: string };
        if (!res.ok) {
          toast.error(data.message ?? "Could not save address");
          return;
        }
      }
      await refresh();
      toast.success(isNew ? "Address added" : "Address saved");
      setEditing(null);
    } catch {
      toast.error("Network error");
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Could not remove address");
        return;
      }
      await refresh();
      toast.info("Address removed");
    } catch {
      toast.error("Network error");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
        <PageHeader
          eyebrow="ADDRESSES"
          title="Where you receive"
          subtitle="Loading…"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="ADDRESSES"
        title="Where you receive"
        subtitle={`Save up to ${ACCOUNT_ADDRESS_LIMIT} addresses. Pick one at checkout.`}
        actions={
          <Button
            variant="primary"
            onClick={startNew}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add address
          </Button>
        }
      />

      <PreviewBanner />

      <ProfileTabNav />

      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses saved"
          body="Add one and it'll be available during checkout."
          cta={
            <Button
              variant="primary"
              onClick={startNew}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              Add address
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {addresses.map((a) => {
            const Icon = ICON_BY_LABEL[a.label];
            return (
              <SectionCard key={a.id} padding="lg">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4"
                      style={{ color: "var(--primary)" }}
                    />
                    <Eyebrow>{a.label.toUpperCase()}</Eyebrow>
                    {a.isDefault && (
                      <span
                        className="font-ui inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] tracking-[0.16em] uppercase"
                        style={{
                          background: "var(--accent-soft)",
                          borderColor: "var(--primary)",
                          color: "var(--primary)",
                        }}
                      >
                        <Star className="h-2.5 w-2.5" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      aria-label="Edit"
                      className="inline-flex h-7 w-7 items-center justify-center transition-opacity hover:opacity-70"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(a.id)}
                      aria-label="Delete"
                      className="inline-flex h-7 w-7 items-center justify-center transition-colors hover:text-[var(--destructive)]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p
                  className="font-body text-sm leading-relaxed"
                  style={{ color: "var(--foreground)" }}
                >
                  <span className="font-ui">{a.recipientName}</span>
                  <br />
                  {a.street}
                  {a.unit ? `, ${a.unit}` : ""}
                  <br />
                  {formatAddressPostalLine(a.postalCode)}
                  <br />
                  <span style={{ color: "var(--muted-foreground)" }}>
                    {a.phone}
                  </span>
                </p>

                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(
                        `/api/account/addresses/${a.id}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isDefault: true }),
                        },
                      );
                      if (res.ok) {
                        await refresh();
                        toast.success("Set as default");
                      }
                    }}
                    className="font-ui mt-4 text-[10px] tracking-[0.18em] uppercase hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Set as default →
                  </button>
                )}
              </SectionCard>
            );
          })}
        </div>
      )}

      <RightInspector
        open={!!editing}
        onClose={() => setEditing(null)}
        eyebrow={
          editing?.id.startsWith("new-") ? "NEW ADDRESS" : "EDIT ADDRESS"
        }
        title={editing?.recipientName || "New address"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => editing && void save(editing)}
            >
              Save
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Label" htmlFor="addr-label">
              <Select
                id="addr-label"
                value={editing.label}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    label: e.target.value as Address["label"],
                  })
                }
              >
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </Select>
            </Field>

            <Field label="Full name" htmlFor="addr-name" required>
              <TextInput
                id="addr-name"
                value={editing.recipientName}
                onChange={(e) =>
                  setEditing({ ...editing, recipientName: e.target.value })
                }
              />
            </Field>

            <Field label="Phone" htmlFor="addr-phone" required>
              <TextInput
                id="addr-phone"
                value={editing.phone}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
                placeholder="+65 9123 4567"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Postal code" htmlFor="addr-postal" required>
                <TextInput
                  id="addr-postal"
                  value={editing.postalCode}
                  onChange={(e) =>
                    setEditing({ ...editing, postalCode: e.target.value })
                  }
                />
              </Field>
              <Field label="Unit" htmlFor="addr-unit">
                <TextInput
                  id="addr-unit"
                  value={editing.unit ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, unit: e.target.value })
                  }
                  placeholder="#14-07"
                />
              </Field>
            </div>

            <Field label="Street" htmlFor="addr-street" required>
              <TextInput
                id="addr-street"
                value={editing.street}
                onChange={(e) =>
                  setEditing({ ...editing, street: e.target.value })
                }
              />
            </Field>

            <Field label="Landmark (for couriers)" htmlFor="addr-landmark">
              <TextInput
                id="addr-landmark"
                value={editing.landmark ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, landmark: e.target.value })
                }
              />
            </Field>

            <Field label="Lift access" layout="inline">
              <Toggle
                checked={editing.hasLiftAccess ?? false}
                onChange={(v) => setEditing({ ...editing, hasLiftAccess: v })}
                label="Lift access"
              />
            </Field>

            <Field label="Set as default" layout="inline">
              <Toggle
                checked={editing.isDefault}
                onChange={(v) => setEditing({ ...editing, isDefault: v })}
                label="Default"
              />
            </Field>
          </div>
        )}
      </RightInspector>

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => {
          if (confirmDel) void remove(confirmDel);
          setConfirmDel(null);
        }}
        title="Remove this address?"
        body="You can always add it again later."
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
