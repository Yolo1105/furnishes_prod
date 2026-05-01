"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  XCircle,
  User as UserIcon,
} from "lucide-react";
import { relativeTime } from "@/lib/site/time";
import {
  supportStatusVariant,
  supportStatusLabel,
  isSupportThreadClosed,
} from "@/lib/site/support/status";
import {
  replyAsStaffAction,
  closeThreadAsStaffAction,
} from "@/lib/actions/admin-support";
import type { SupportThread } from "@/lib/site/support/types";

type Thread = SupportThread & {
  userId: string;
  userEmail: string;
  userName: string | null;
};

export function AdminSupportThreadView({
  thread: initial,
}: {
  thread: Thread;
}) {
  const [thread, setThread] = useState<Thread>(initial);
  const [reply, setReply] = useState("");
  const [closing, setClosing] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isPending, startReply] = useTransition();
  const [isClosing, startClose] = useTransition();
  const router = useRouter();

  const isHelp = thread.kind === "HELP";
  const closed = isSupportThreadClosed(thread.status);

  const sendReply = () => {
    const content = reply.trim();
    if (!content || isPending) return;
    setReplyError(null);
    startReply(async () => {
      const res = await replyAsStaffAction({
        threadId: thread.id,
        content,
      });
      if (!res.ok) {
        setReplyError(res.error);
        return;
      }
      // Optimistic — append the message locally
      const now = new Date().toISOString();
      setThread((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: res.data.messageId,
            role: "staff",
            staffName: "You — Furnishes Support",
            content,
            at: now,
          },
        ],
        status: isHelp ? "awaiting_user" : "under_review",
        updatedAt: now,
      }));
      setReply("");
      router.refresh();
    });
  };

  const closeWith = (
    resolution: "resolved" | "wont_ship" | "shipped" | "declined",
  ) => {
    startClose(async () => {
      const res = await closeThreadAsStaffAction({
        threadId: thread.id,
        resolution,
      });
      if (!res.ok) {
        alert(res.error);
        return;
      }
      const now = new Date().toISOString();
      setThread((prev) => ({
        ...prev,
        status: resolution,
        closedAt: now,
        updatedAt: now,
      }));
      setClosing(false);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <Link
        href="/admin/support"
        className="font-ui inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
        style={{ color: "var(--muted-foreground)" }}
      >
        <ArrowLeft className="h-3 w-3" />
        Back to inbox
      </Link>

      <div className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-mono text-[12px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {thread.number}
          </span>
          <span
            className="font-ui text-[10.5px] tracking-[0.16em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            {thread.kind} · {thread.category}
          </span>
        </div>
        <h1
          className="font-display mt-1 text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          {thread.title}
        </h1>
        <p
          className="font-body mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          From {thread.userName ?? "unnamed user"} ({thread.userEmail}) · opened{" "}
          {relativeTime(thread.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* ── Thread + reply ──────────────────────────────── */}
        <div className="space-y-4">
          <div
            className="border p-6"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
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

            {!closed && (
              <div
                className="mt-6 border-t pt-5"
                style={{ borderColor: "var(--border)" }}
              >
                <p
                  className="font-ui mb-2 text-[10.5px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  [ STAFF REPLY ]
                </p>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  placeholder="Write a reply to the user…"
                  disabled={isPending}
                  className="font-body w-full border px-3 py-2 text-sm"
                  style={{
                    background: "var(--input)",
                    borderColor: "var(--border-strong)",
                    color: "var(--foreground)",
                  }}
                />
                {replyError && (
                  <p
                    role="alert"
                    className="font-body mt-2 text-xs"
                    style={{ color: "var(--destructive, #b8431d)" }}
                  >
                    {replyError}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className="font-ui text-[10px] tracking-[0.06em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    User will receive an email notification
                  </span>
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={!reply.trim() || isPending}
                    className="font-ui inline-flex items-center gap-2 border px-4 py-2 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      color: "var(--primary-foreground)",
                      background: "var(--primary)",
                      borderColor: "var(--primary)",
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isPending ? "Sending…" : "Send reply"}
                  </button>
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
                  This thread is closed. The user can start a new one if needed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="space-y-4">
          <div
            className="border p-5"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              [ STATUS ]
            </p>
            <p
              className="font-display mt-2 text-lg"
              style={{
                color:
                  supportStatusVariant(thread.status) === "warn"
                    ? "#9a6f1c"
                    : supportStatusVariant(thread.status) === "ok"
                      ? "#2c7a3a"
                      : "var(--foreground)",
              }}
            >
              {supportStatusLabel(thread.status)}
            </p>
          </div>

          <div
            className="border p-5"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              [ USER ]
            </p>
            <div className="mt-2 flex items-center gap-2">
              <UserIcon
                className="h-4 w-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              <span
                className="font-body text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {thread.userName ?? "—"}
              </span>
            </div>
            <p
              className="mt-1 font-mono text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {thread.userEmail}
            </p>
          </div>

          {thread.metadata?.reproductionFrequency && (
            <div
              className="border p-5"
              style={{
                background: "var(--card-soft)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                [ BUG REPRODUCES ]
              </p>
              <p
                className="font-display mt-2 text-base capitalize"
                style={{ color: "var(--foreground)" }}
              >
                {String(thread.metadata.reproductionFrequency)}
              </p>
            </div>
          )}

          {!closed && (
            <div
              className="border p-5"
              style={{
                background: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <p
                className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                [ CLOSE THREAD ]
              </p>
              {!closing ? (
                <button
                  type="button"
                  onClick={() => setClosing(true)}
                  className="font-ui mt-3 w-full border px-3 py-2 text-[10.5px] tracking-[0.18em] uppercase transition-opacity hover:opacity-80"
                  style={{
                    color: "var(--foreground)",
                    borderColor: "var(--border-strong)",
                    background: "transparent",
                  }}
                >
                  Choose resolution
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  {isHelp ? (
                    <button
                      type="button"
                      onClick={() => closeWith("resolved")}
                      disabled={isClosing}
                      className="font-ui inline-flex w-full items-center gap-2 border px-3 py-2 text-[10.5px] tracking-[0.18em] uppercase"
                      style={{
                        color: "#2c7a3a",
                        borderColor: "#2c7a3a",
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolved
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => closeWith("shipped")}
                        disabled={isClosing}
                        className="font-ui inline-flex w-full items-center gap-2 border px-3 py-2 text-[10.5px] tracking-[0.18em] uppercase"
                        style={{
                          color: "#2c7a3a",
                          borderColor: "#2c7a3a",
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Shipped
                      </button>
                      <button
                        type="button"
                        onClick={() => closeWith("wont_ship")}
                        disabled={isClosing}
                        className="font-ui inline-flex w-full items-center gap-2 border px-3 py-2 text-[10.5px] tracking-[0.18em] uppercase"
                        style={{
                          color: "var(--muted-foreground)",
                          borderColor: "var(--border-strong)",
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Won&apos;t ship
                      </button>
                      <button
                        type="button"
                        onClick={() => closeWith("declined")}
                        disabled={isClosing}
                        className="font-ui inline-flex w-full items-center gap-2 border px-3 py-2 text-[10.5px] tracking-[0.18em] uppercase"
                        style={{
                          color: "var(--muted-foreground)",
                          borderColor: "var(--border-strong)",
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Declined
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setClosing(false)}
                    className="font-ui w-full text-[10px] tracking-[0.18em] uppercase opacity-60 hover:opacity-100"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
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
            className="font-ui text-[10.5px] tracking-[0.18em] uppercase"
            style={{ color: "var(--foreground)" }}
          >
            {isStaff ? (staffName ?? "Furnishes") : "User"}
          </span>
          <span
            className="font-ui text-[10.5px] tabular-nums"
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
