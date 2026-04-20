"use client";

import { useState } from "react";
import { Check, Lock, Mail, MessageSquare } from "lucide-react";
import {
  PageHeader,
  FormSection,
  Field,
  Toggle,
  SectionCard,
  Eyebrow,
  Button,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { ProfileTabNav } from "../profile-tab-nav";
import {
  ACCOUNT_DPO_EMAIL,
  ACCOUNT_DPO_MAILTO,
} from "@/lib/site/account/account-contacts";
import { getMockContactPrefs } from "@/lib/site/commerce/mock-data";
import type { ContactPrefs } from "@/lib/site/commerce/types";

export function ContactPrefsView() {
  const [prefs, setPrefs] = useState<ContactPrefs>(getMockContactPrefs());
  const [saved, setSaved] = useState(prefs);
  const { toast } = useToast();

  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);

  const save = () => {
    setSaved(prefs);
    toast.success("Contact preferences saved");
  };

  return (
    <div className="mx-auto w-full max-w-[1020px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="CONTACT"
        title="How we reach you"
        subtitle="Marketing opt-ins and delivery SMS. For in-app notifications from Eva, go to Notifications."
        actions={
          <Button
            variant="primary"
            onClick={save}
            disabled={!dirty}
            icon={<Check className="h-3.5 w-3.5" />}
          >
            Save changes
          </Button>
        }
      />

      <PreviewBanner />

      <ProfileTabNav />

      <FormSection eyebrow="MARKETING" title="Marketing communications">
        <div
          className="flex items-center justify-between border-b py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-3">
            <Mail
              className="mt-0.5 h-4 w-4"
              style={{ color: "var(--muted-foreground)" }}
            />
            <div>
              <div
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Marketing emails
              </div>
              <p
                className="font-body mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                New collection drops, seasonal sales, editorial posts. You can
                unsubscribe from any email with one click.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs.marketingEmailOptIn}
            onChange={(v) => setPrefs({ ...prefs, marketingEmailOptIn: v })}
            label="Marketing emails"
          />
        </div>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-start gap-3">
            <MessageSquare
              className="mt-0.5 h-4 w-4"
              style={{ color: "var(--muted-foreground)" }}
            />
            <div>
              <div
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Marketing SMS
              </div>
              <p
                className="font-body mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Rare — saved for truly big news. Reply STOP to opt out at any
                time.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs.marketingSmsOptIn}
            onChange={(v) => setPrefs({ ...prefs, marketingSmsOptIn: v })}
            label="Marketing SMS"
          />
        </div>
      </FormSection>

      <FormSection eyebrow="DELIVERY" title="Delivery & order updates">
        <div
          className="flex items-center justify-between border-b py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-3">
            <MessageSquare
              className="mt-0.5 h-4 w-4"
              style={{ color: "var(--muted-foreground)" }}
            />
            <div>
              <div
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Delivery SMS
              </div>
              <p
                className="font-body mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Morning-of arrival SMS and delivery window updates. Only
                transactional — never marketing.
              </p>
            </div>
          </div>
          <Toggle
            checked={prefs.deliverySmsOptIn}
            onChange={(v) => setPrefs({ ...prefs, deliverySmsOptIn: v })}
            label="Delivery SMS"
          />
        </div>

        <div className="flex items-center justify-between py-3 opacity-75">
          <div className="flex items-start gap-3">
            <Lock
              className="mt-0.5 h-4 w-4"
              style={{ color: "var(--muted-foreground)" }}
            />
            <div>
              <div
                className="font-ui flex items-center gap-2 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Transactional emails
                <span
                  className="font-ui border px-1.5 py-0.5 text-[9px] tracking-[0.16em] uppercase"
                  style={{
                    borderColor: "var(--border-strong)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Required
                </span>
              </div>
              <p
                className="font-body mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Order confirmations, receipts, account security. Cannot be
                disabled — these are required by law and consumer protection.
              </p>
            </div>
          </div>
        </div>
      </FormSection>

      <SectionCard padding="lg" tone="muted">
        <Eyebrow>PDPA</Eyebrow>
        <p
          className="font-body mt-2 text-sm"
          style={{ color: "var(--foreground)" }}
        >
          Furnishes complies with Singapore's Personal Data Protection Act. You
          can withdraw consent for marketing communications at any time. For
          data access, rectification, or deletion requests, contact our Data
          Protection Officer.
        </p>
        <a
          href={ACCOUNT_DPO_MAILTO}
          className="font-ui mt-3 inline-block text-[10.5px] tracking-[0.18em] uppercase hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {ACCOUNT_DPO_EMAIL} →
        </a>
      </SectionCard>
    </div>
  );
}
