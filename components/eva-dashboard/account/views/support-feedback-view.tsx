"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  Send,
  Paperclip,
  Megaphone,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  Button,
  Field,
  TextInput,
  Textarea,
  Select,
  Toggle,
  StatusBadge,
  EmptyState,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { SupportTabNav } from "../support-tab-nav";
import { relativeTime } from "@/lib/site/time";
import {
  supportStatusVariant,
  supportStatusLabel,
} from "@/lib/site/support/status";
import { createFeedbackThreadAction } from "@/lib/actions/support";
import type { SupportThread } from "@/lib/site/support/types";

const TYPES = [
  { key: "bug", label: "Bug", icon: Bug, subtitle: "Something's broken" },
  {
    key: "feature",
    label: "Feature idea",
    icon: Lightbulb,
    subtitle: "Suggest something new",
  },
  {
    key: "general",
    label: "General",
    icon: MessageCircle,
    subtitle: "Tell us how it's going",
  },
] as const;

type FeedbackType = "bug" | "feature" | "general";
type ReproFreq = "always" | "often" | "sometimes" | "once";

export function SupportFeedbackView({
  initial = [],
}: {
  initial?: SupportThread[];
}) {
  const [type, setType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reproFreq, setReproFreq] = useState<ReproFreq>("sometimes");
  const [okToFollow, setOkToFollow] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const threads = initial;
  const canSubmit =
    !!type && title.trim().length >= 4 && body.trim().length >= 10;

  const submit = () => {
    if (!canSubmit || !type || isPending) return;
    setFormError(null);
    startTransition(async () => {
      const res = await createFeedbackThreadAction({
        category: type,
        title: title.trim(),
        body: body.trim(),
        reproductionFrequency: type === "bug" ? reproFreq : undefined,
      });
      if (!res.ok) {
        setFormError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(
        type === "bug"
          ? `Bug report ${res.data.number} filed — thanks for the detail`
          : `Feedback ${res.data.number} sent — a human will read this`,
      );
      setType(null);
      setTitle("");
      setBody("");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        eyebrow="SUPPORT"
        title="Tell us what you think"
        subtitle="Bugs, feature ideas, or just how it's going. Every submission is read by a human on the product team."
      />

      <SupportTabNav />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Left — form */}
        <SectionCard padding="lg">
          <Eyebrow>NEW FEEDBACK</Eyebrow>
          <div className="mt-5 space-y-5">
            {/* Type cards */}
            <div>
              <label
                className="font-ui mb-2 block text-[10px] tracking-[0.16em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  const selected = type === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setType(t.key as FeedbackType)}
                      className="flex flex-col items-start gap-1.5 border p-3 text-left transition-colors"
                      style={{
                        background: selected
                          ? "var(--accent-soft)"
                          : "var(--card)",
                        borderColor: selected
                          ? "var(--primary)"
                          : "var(--border)",
                      }}
                    >
                      <Icon
                        className="h-4 w-4"
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
                        {t.label}
                      </span>
                      <span
                        className="font-body text-[11px]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {t.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Title" htmlFor="fb-title" required>
              <TextInput
                id="fb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="One-line summary"
              />
            </Field>

            <Field label="Description" htmlFor="fb-body" required>
              <Textarea
                id="fb-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="What happened, or what would you like to see?"
              />
            </Field>

            {/* Bug-specific fields */}
            {type === "bug" && (
              <div
                className="space-y-4 border-l-2 pl-4"
                style={{ borderColor: "var(--primary)" }}
              >
                <Field label="Can you reproduce it?" htmlFor="fb-repro">
                  <Select
                    id="fb-repro"
                    value={reproFreq}
                    onChange={(e) => setReproFreq(e.target.value as ReproFreq)}
                  >
                    <option value="always">Always</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="once">Just once</option>
                  </Select>
                </Field>
              </div>
            )}

            <Field
              label="OK for the team to follow up by email"
              layout="inline"
            >
              <Toggle
                checked={okToFollow}
                onChange={setOkToFollow}
                label="OK to follow up"
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
                Attach screenshot
              </button>
              <Button
                variant="primary"
                onClick={submit}
                disabled={!canSubmit || isPending}
                icon={<Send className="h-3.5 w-3.5" />}
              >
                {isPending ? "Sending…" : "Send to product team"}
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Right — how we handle this */}
        <SectionCard padding="lg" tone="muted">
          <Eyebrow>HOW WE HANDLE THIS</Eyebrow>
          <div className="mt-4 space-y-3">
            <div>
              <h4
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Humans read everything
              </h4>
              <p
                className="font-body mt-1 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                No auto-responses — every submission lands in a shared queue
                reviewed by our small product team.
              </p>
            </div>
            <div>
              <h4
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Bugs get triaged within 48h
              </h4>
              <p
                className="font-body mt-1 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Critical issues jump the queue. We fix or acknowledge with a
                timeline.
              </p>
            </div>
            <div>
              <h4
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Feature ideas go on the backlog
              </h4>
              <p
                className="font-body mt-1 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                We can't promise everything ships — but we'll be honest about
                what does, what won't, and why.
              </p>
            </div>
            <div>
              <h4
                className="font-ui text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Replies when there's news
              </h4>
              <p
                className="font-body mt-1 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                You'll hear from us when there's something real to say, not just
                to confirm receipt.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Feedback history */}
      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <Eyebrow>YOUR FEEDBACK</Eyebrow>
            <h2
              className="font-display mt-2 text-xl"
              style={{ color: "var(--foreground)" }}
            >
              What you've sent us
            </h2>
          </div>
        </div>

        {threads.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No feedback yet"
            body="Everything you share shows up here — along with what came of it."
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
