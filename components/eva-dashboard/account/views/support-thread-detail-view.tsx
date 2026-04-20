"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Sparkles,
  X,
  FolderKanban,
  MessageSquare,
  Info,
  LifeBuoy,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  StatusBadge,
  Button,
  LinkButton,
  Textarea,
  ConfirmDialog,
  useToast,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/time";
import {
  supportStatusVariant,
  supportStatusLabel,
  isSupportThreadClosed,
} from "@/lib/site/support/status";
import { replyToThreadAction, closeThreadAction } from "@/lib/actions/support";
import type { SupportThread } from "@/lib/site/support/types";

export function SupportThreadDetailView({
  id,
  initial,
}: {
  id: string;
  initial?: SupportThread;
}) {
  // If the server couldn't find the thread, show not-found state.
  if (!initial) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-6 py-16 text-center sm:px-8 lg:px-10">
        <h1
          className="font-display text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Thread not found
        </h1>
        <p
          className="font-body mt-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Reference: {id}
        </p>
        <LinkButton
          href="/account/support/help"
          variant="secondary"
          className="mt-6"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back to support
        </LinkButton>
      </div>
    );
  }

  // Local copy of the thread — updated optimistically when user replies
  // or closes so the UI responds immediately instead of waiting for the
  // server round-trip.
  const [thread, setThread] = useState<SupportThread>(initial);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isReplying, startReply] = useTransition();
  const [isClosing, startClose] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const isHelp = thread.kind === "HELP";
  const closed = isSupportThreadClosed(thread.status);
  const backHref = isHelp
    ? "/account/support/help"
    : "/account/support/feedback";

  /* ── Reply ─────────────────────────────────────────────── */

  const sendReply = () => {
    const trimmed = reply.trim();
    if (!trimmed || isReplying) return;
    setReplyError(null);
    startReply(async () => {
      const res = await replyToThreadAction({
        threadId: thread.id,
        content: trimmed,
      });
      if (!res.ok) {
        setReplyError(res.error);
        toast.error(res.error);
        return;
      }
      // Optimistic local append so the new message shows right away
      const now = new Date().toISOString();
      setThread((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: `sm_${Date.now().toString(36)}`,
            role: "user",
            content: trimmed,
            at: now,
          },
        ],
        updatedAt: now,
        status: isHelp ? "open" : "under_review",
      }));
      setReply("");
      toast.success("Reply sent");
      // Also trigger a server-data refresh so history lists update elsewhere
      router.refresh();
    });
  };

  /* ── Close / withdraw ─────────────────────────────────── */

  const confirmAndClose = () => {
    startClose(async () => {
      const res = await closeThreadAction({ threadId: thread.id });
      if (!res.ok) {
        toast.error(res.error);
        setConfirmClose(false);
        return;
      }
      const now = new Date().toISOString();
      setThread((prev) => ({
        ...prev,
        status: isHelp ? "resolved" : "wont_ship",
        closedAt: now,
        updatedAt: now,
      }));
      setConfirmClose(false);
      toast.success(isHelp ? "Ticket closed" : "Feedback withdrawn");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        breadcrumbs={[
          { icon: LifeBuoy, label: "Support", href: "/account/support" },
          {
            label: isHelp ? "Help" : "Feedback",
            href: backHref,
          },
          { label: thread.number },
        ]}
        breadcrumbActions={
          <StatusBadge variant={supportStatusVariant(thread.status)}>
            {supportStatusLabel(thread.status)}
          </StatusBadge>
        }
        title={thread.title}
        subtitle={`Opened ${relativeTime(thread.createdAt)}`}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* ── Left — thread ─────────────────────────────── */}
        <div className="space-y-4">
          <SectionCard padding="lg">
            <ul className="space-y-5">
              {thread.messages.map((m) => (
                <li key={m.id}>
                  <MessageRow
                    role={m.role}
                    staffName={m.staffName}
                    content={m.content}
                    at={m.at}
                  />
                </li>
              ))}
            </ul>

            {/* Reply composer — only if thread not closed */}
            {!closed && (
              <div
                className="mt-6 border-t pt-5"
                style={{ borderColor: "var(--border)" }}
              >
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  placeholder="Write a reply…"
                  disabled={isReplying}
                />
                {replyError && (
                  <p
                    role="alert"
                    className="font-body mt-2 text-xs"
                    style={{ color: "var(--destructive)" }}
                  >
                    {replyError}
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={sendReply}
                    disabled={!reply.trim() || isReplying}
                    icon={<Send className="h-3.5 w-3.5" />}
                  >
                    {isReplying ? "Sending…" : "Send reply"}
                  </Button>
                </div>
              </div>
            )}

            {closed && (
              <div
                className="mt-6 border-t pt-4 text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <p
                  className="font-body text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  This thread is closed. Need more help?{" "}
                  <Link
                    href={backHref}
                    className="underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Start a new one
                  </Link>
                  .
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── Right — metadata rail ─────────────────────── */}
        <aside className="space-y-4">
          <SectionCard padding="lg">
            <Eyebrow>DETAILS</Eyebrow>
            <dl
              className="font-body mt-3 space-y-3 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              <div>
                <dt
                  className="font-ui text-[10px] tracking-[0.16em] uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Reference
                </dt>
                <dd className="font-mono text-xs">#{thread.number}</dd>
              </div>
              <div>
                <dt
                  className="font-ui text-[10px] tracking-[0.16em] uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Category
                </dt>
                <dd className="capitalize">
                  {thread.category.replace(/_/g, " ")}
                </dd>
              </div>
              <div>
                <dt
                  className="font-ui text-[10px] tracking-[0.16em] uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Last update
                </dt>
                <dd className="text-xs">{relativeTime(thread.updatedAt)}</dd>
              </div>
              {thread.closedAt && (
                <div>
                  <dt
                    className="font-ui text-[10px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Closed
                  </dt>
                  <dd className="text-xs">{relativeTime(thread.closedAt)}</dd>
                </div>
              )}
            </dl>
          </SectionCard>

          {/* Bug report metadata panel */}
          {thread.metadata?.reproductionFrequency && (
            <SectionCard padding="lg" tone="soft">
              <Eyebrow>BUG CONTEXT</Eyebrow>
              <div
                className="mt-3 flex items-start gap-2 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                <Info
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <div>
                  <div
                    className="font-ui text-[10px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Reproduces
                  </div>
                  <div className="font-body capitalize">
                    {thread.metadata.reproductionFrequency}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {thread.linkedProjectId && (
            <SectionCard padding="lg">
              <Eyebrow>LINKED</Eyebrow>
              <Link
                href={`/account/projects/${thread.linkedProjectId}`}
                className="font-ui mt-3 inline-flex items-center gap-2 text-sm hover:underline"
                style={{ color: "var(--primary)" }}
              >
                <FolderKanban className="h-4 w-4" />
                View project
              </Link>
            </SectionCard>
          )}

          {!closed && (
            <SectionCard padding="lg">
              <Eyebrow>ACTIONS</Eyebrow>
              <div className="mt-3 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClose(true)}
                  disabled={isClosing}
                  icon={<X className="h-3.5 w-3.5" />}
                  className="w-full justify-start"
                >
                  {isHelp ? "Close ticket" : "Withdraw feedback"}
                </Button>
              </div>
            </SectionCard>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={confirmAndClose}
        title={isHelp ? "Close this ticket?" : "Withdraw this feedback?"}
        body={
          isHelp
            ? "You can always start a new ticket if you need more help. This one will be archived."
            : "The feedback will be withdrawn from the product team's review queue. You can submit it again later if needed."
        }
        confirmLabel={
          isClosing ? "Working…" : isHelp ? "Close ticket" : "Withdraw"
        }
        destructive
      />
    </div>
  );
}

function MessageRow({
  role,
  staffName,
  content,
  at,
}: {
  role: "user" | "staff";
  staffName?: string;
  content: string;
  at: string;
}) {
  const isStaff = role === "staff";
  return (
    <div className="flex gap-3">
      <div
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center border"
        style={{
          background: isStaff ? "var(--primary)" : "var(--muted)",
          borderColor: "var(--border)",
          color: isStaff ? "var(--primary-foreground)" : "var(--foreground)",
        }}
      >
        {isStaff ? (
          <Sparkles className="h-3.5 w-3.5" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="font-ui text-[10px] tracking-[0.18em] uppercase"
            style={{ color: "var(--foreground)" }}
          >
            {isStaff ? (staffName ?? "Furnishes") : "You"}
          </span>
          <span
            className="font-ui text-[10px] tabular-nums"
            style={{ color: "var(--muted-foreground)" }}
          >
            {relativeTime(at)}
          </span>
        </div>
        <p
          className="font-body mt-1 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--foreground)" }}
        >
          {content}
        </p>
      </div>
    </div>
  );
}
