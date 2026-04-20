"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Package,
  CreditCard,
  ShieldCheck,
  MessageCircleQuestion,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  Button,
  Field,
  TextInput,
  Textarea,
  StatusBadge,
  EmptyState,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { SupportTabNav } from "../support-tab-nav";
import { ACCOUNT_DPO_MAILTO } from "@/lib/site/account/account-contacts";
import { relativeTime } from "@/lib/site/time";
import {
  supportStatusVariant,
  supportStatusLabel,
} from "@/lib/site/support/status";
import { createHelpThreadAction } from "@/lib/actions/support";
import type { SupportThread } from "@/lib/site/support/types";

const CATEGORIES = [
  { key: "order", label: "Order or delivery", icon: Package, soon: false },
  { key: "billing", label: "Billing", icon: CreditCard, soon: false },
  { key: "access", label: "Account access", icon: ShieldCheck, soon: false },
  {
    key: "other",
    label: "Something else",
    icon: MessageCircleQuestion,
    soon: false,
  },
] as const;

type HelpCategory = "order" | "billing" | "access" | "other";

export function SupportHelpView({
  initial = [],
}: {
  initial?: SupportThread[];
}) {
  const [category, setCategory] = useState<HelpCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const threads = initial;
  const canSubmit =
    !!category && subject.trim().length >= 4 && body.trim().length >= 10;

  const submit = () => {
    if (!canSubmit || !category || isPending) return;
    setFormError(null);
    startTransition(async () => {
      const res = await createHelpThreadAction({
        category,
        title: subject.trim(),
        body: body.trim(),
      });
      if (!res.ok) {
        setFormError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(
        `Ticket ${res.data.number} submitted — we'll reply within 24h`,
      );
      setCategory(null);
      setSubject("");
      setBody("");
      // Refresh server data so the new ticket shows in history
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="SUPPORT"
        title="How can we help?"
        subtitle="Get a human reply within 24h (Mon–Fri, Singapore time)."
      />

      <SupportTabNav />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left — submission form */}
        <SectionCard padding="lg">
          <Eyebrow>NEW TICKET</Eyebrow>
          <p
            className="font-body mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Pick a category, give us the details — be as specific as you can.
          </p>

          <div className="mt-5 space-y-5">
            {/* Category cards */}
            <div>
              <label
                className="font-ui mb-2 block text-[10px] tracking-[0.16em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const selected = category === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() =>
                        !c.soon && setCategory(c.key as HelpCategory)
                      }
                      disabled={c.soon}
                      className="flex items-center gap-2 border p-3 text-left transition-colors disabled:cursor-not-allowed"
                      style={{
                        background: selected
                          ? "var(--accent-soft)"
                          : "var(--card)",
                        borderColor: selected
                          ? "var(--primary)"
                          : "var(--border)",
                        opacity: c.soon ? 0.5 : 1,
                      }}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{
                          color: selected
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                        }}
                      />
                      <span
                        className="font-ui text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {c.label}
                      </span>
                      {c.soon && (
                        <span
                          className="font-ui ml-auto border px-1 py-0.5 text-[8px] tracking-[0.16em] uppercase"
                          style={{
                            borderColor: "var(--border-strong)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Subject" htmlFor="sub-subject" required>
              <TextInput
                id="sub-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
              />
            </Field>

            <Field label="Description" htmlFor="sub-body" required>
              <Textarea
                id="sub-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="What's happening? Include steps if it's a specific action."
              />
            </Field>

            {formError && (
              <div
                role="alert"
                className="font-body border px-3 py-2 text-xs"
                style={{
                  background: "rgba(180,68,42,0.06)",
                  borderColor: "rgba(180,68,42,0.25)",
                  color: "var(--destructive)",
                }}
              >
                {formError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  toast.info("Attachment upload requires R2 — UI only for now")
                }
                className="font-ui inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Paperclip className="h-3 w-3" />
                Attach files
              </button>
              <Button
                variant="primary"
                onClick={submit}
                disabled={!canSubmit || isPending}
                icon={<Send className="h-3.5 w-3.5" />}
              >
                {isPending ? "Sending…" : "Send to support"}
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Right — self-help */}
        <SectionCard padding="lg" tone="muted">
          <Eyebrow>TRY THIS FIRST</Eyebrow>
          <p
            className="font-body mt-2 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            Quick answers for common questions — instant, no waiting.
          </p>
          <ul className="mt-4 space-y-2">
            <SelfHelpLink
              href="/account/security"
              label="Change your password or set up 2FA"
            />
            <SelfHelpLink
              href="/account/privacy"
              label="Export your data or request account deletion"
            />
            <SelfHelpLink
              href="/account/billing"
              label="Change your plan or manage invoices"
            />
            <SelfHelpLink
              href="/account/notifications"
              label="Silence notifications or set quiet hours"
            />
            <SelfHelpLink
              href="/account/profile/addresses"
              label="Add or update delivery addresses"
            />
            <SelfHelpLink
              href={ACCOUNT_DPO_MAILTO}
              label="Contact our Data Protection Officer (PDPA requests)"
              external
            />
          </ul>
          <p
            className="font-body mt-5 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            Our team replies within 24 hours on business days. For PDPA
            requests, response within 30 days as required by Singapore law.
          </p>
        </SectionCard>
      </div>

      {/* Open tickets */}
      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <Eyebrow>YOUR TICKETS</Eyebrow>
            <h2
              className="font-display mt-2 text-xl"
              style={{ color: "var(--foreground)" }}
            >
              Your support history
            </h2>
          </div>
          {threads.length > 0 && (
            <span
              className="font-ui text-xs tabular-nums"
              style={{ color: "var(--muted-foreground)" }}
            >
              {threads.length} total
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <EmptyState
            icon={MessageCircleQuestion}
            title="No tickets yet"
            body="If you ever need help, this is where your threads will live."
          />
        ) : (
          <SectionCard padding="none">
            <ul className="divide-border divide-y">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/account/support/${t.id}`}
                    className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-ui font-mono text-[10px] tracking-wider uppercase"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          #{t.number}
                        </span>
                        <StatusBadge variant={supportStatusVariant(t.status)}>
                          {supportStatusLabel(t.status)}
                        </StatusBadge>
                      </div>
                      <h3
                        className="font-ui mt-1 text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {t.title}
                      </h3>
                      <p
                        className="font-body mt-0.5 line-clamp-1 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {t.body}
                      </p>
                    </div>
                    <span
                      className="font-ui shrink-0 text-[10px] tabular-nums"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {relativeTime(t.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function SelfHelpLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="font-body group flex items-center justify-between gap-2 border-b py-2 text-sm transition-colors hover:opacity-70"
        style={{
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      >
        <span>{label}</span>
        <ExternalLink
          className="h-3 w-3 shrink-0"
          style={{ color: "var(--muted-foreground)" }}
        />
      </Link>
    </li>
  );
}
