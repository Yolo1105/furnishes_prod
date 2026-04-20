"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import {
  PageHeader,
  FormSection,
  Field,
  TextInput,
  Button,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { ProfileTabNav } from "../profile-tab-nav";
import { saveProfileAction } from "@/lib/actions/profile";
import type { AccountIdentityState } from "@/lib/site/account/server/profile";

export function ProfileIdentityView({
  initial,
}: {
  initial: AccountIdentityState;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [savedName, setSavedName] = useState(initial.name);
  const [savedPhone, setSavedPhone] = useState(initial.phone);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const dirty = name !== savedName || phone !== savedPhone;

  const save = () => {
    startTransition(async () => {
      const res = await saveProfileAction({
        name: name.trim() || undefined,
        phone: phone.trim() ? phone.trim() : null,
      });
      if (!res.ok) {
        toast.error("Could not save. Check your details and try again.");
        return;
      }
      setSavedName(name.trim());
      setSavedPhone(phone.trim());
      toast.success("Identity saved");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="IDENTITY"
        title="Who you are"
        subtitle="How you appear to Eva and on shared projects."
        actions={
          <>
            {dirty && (
              <Button
                variant="ghost"
                onClick={() => {
                  setName(savedName);
                  setPhone(savedPhone);
                  toast.info("Changes discarded");
                }}
              >
                Discard
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!dirty || pending || !name.trim()}
              onClick={save}
              icon={<Check className="h-3.5 w-3.5" />}
            >
              Save changes
            </Button>
          </>
        }
      />

      <PreviewBanner />

      <ProfileTabNav />

      {dirty && (
        <div
          className="mb-5 flex items-center gap-2 border px-4 py-2 text-sm"
          style={{
            background: "var(--accent-soft)",
            borderColor: "var(--primary)",
            color: "var(--foreground)",
          }}
        >
          <AlertCircle
            className="h-4 w-4"
            style={{ color: "var(--primary)" }}
          />
          You have unsaved changes.
        </div>
      )}

      <FormSection eyebrow="AVATAR" title="Display image">
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center border"
            style={{
              background: "var(--muted)",
              borderColor: "var(--border)",
            }}
          >
            <span
              className="font-display text-2xl"
              style={{ color: "var(--foreground)" }}
            >
              {(name || email || "?")
                .split(" ")
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled
            title="Not available yet"
          >
            Change avatar
          </Button>
        </div>
      </FormSection>

      <FormSection eyebrow="DETAILS" title="Personal details">
        <Field label="Display name" htmlFor="name">
          <TextInput
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field
          label="Email"
          htmlFor="email"
          hint={initial.emailVerified ? "✓ Verified" : "Not verified yet"}
        >
          <TextInput
            id="email"
            type="email"
            value={email}
            disabled
            className="opacity-60"
          />
        </Field>

        <Field
          label="Phone"
          htmlFor="phone"
          hint={
            initial.phoneVerified
              ? "✓ Verified"
              : "Add a number for delivery SMS where applicable"
          }
        >
          <TextInput
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+65 9123 4567"
          />
        </Field>
      </FormSection>
    </div>
  );
}
