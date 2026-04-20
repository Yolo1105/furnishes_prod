"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  MessageSquare,
  MessagesSquare,
  Sparkles,
  Trash2,
  Share2,
  FolderKanban,
  Tag as TagIcon,
} from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  SectionCard,
  StatusBadge,
  Button,
  LinkButton,
  ConfirmDialog,
  useToast,
  PreviewBanner,
} from "@/components/eva-dashboard/account/shared";
import { relativeTime } from "@/lib/site/account/formatters";
import type { AccountConversationDetail } from "@/lib/site/account/types";
import type { ConversationMessage } from "@/lib/site/account/types";

export function ConversationDetailView({
  detail,
}: {
  detail: AccountConversationDetail;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const convo = detail.summary;

  const share = async () => {
    try {
      const res = await fetch(`/api/conversations/${convo.id}/share`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not create a share link.");
        return;
      }
      const data = (await res.json()) as { shareUrl?: string };
      if (data.shareUrl && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success("Share link copied");
      }
    } catch {
      toast.error("Share failed");
    }
  };

  const remove = () => {
    startTransition(async () => {
      const res = await fetch(`/api/conversations/${convo.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not delete conversation.");
        return;
      }
      toast.success("Conversation deleted");
      router.push("/account/conversations");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 md:py-10 lg:px-10">
      <PageHeader
        breadcrumbs={[
          {
            icon: MessagesSquare,
            label: "Conversations",
            href: "/account/conversations",
          },
          { label: convo.title },
        ]}
        title={convo.title}
        subtitle={`${convo.messageCount} messages · ${convo.inferredPreferenceCount} in-conversation preferences · ${relativeTime(convo.updatedAt)}`}
        meta={<StatusBadge variant={convo.status} />}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void share()}
              icon={<Share2 className="h-3.5 w-3.5" />}
            >
              Share link
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete
            </Button>
          </>
        }
      />

      <PreviewBanner />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <SectionCard padding="lg">
          <div className="space-y-5">
            {detail.messages.map((m) => (
              <MessageRow key={m.id} msg={m} />
            ))}
          </div>

          <div
            className="mt-6 flex items-center justify-between border-t pt-4"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-[10px] tracking-[0.2em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              Continue the live thread in Eva
            </span>
            <LinkButton
              href={`/chatbot?conversationId=${encodeURIComponent(convo.id)}`}
              variant="primary"
              size="sm"
            >
              Open in Eva
            </LinkButton>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard padding="lg">
            <Eyebrow>PROJECT</Eyebrow>
            {detail.projectId ? (
              <Link
                href={`/account/projects/${detail.projectId}`}
                className="mt-2 flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--foreground)" }}
              >
                <FolderKanban
                  className="h-4 w-4"
                  style={{ color: "var(--primary)" }}
                />
                {detail.projectName ?? "Project"}
              </Link>
            ) : (
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Not assigned to a project.
              </p>
            )}
          </SectionCard>

          <SectionCard padding="lg">
            <Eyebrow>TAGS</Eyebrow>
            {detail.tags.length === 0 ? (
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No tags stored for this thread.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] tracking-wider uppercase"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    <TagIcon className="h-2.5 w-2.5" />
                    {t}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard padding="lg">
            <Eyebrow>SHARED WITH</Eyebrow>
            {detail.sharedWith.length === 0 ? (
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Just you.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.sharedWith.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-semibold"
                      style={{
                        background: "var(--muted)",
                        borderColor: "var(--border)",
                      }}
                    >
                      {u.initials}
                    </span>
                    {u.name}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          remove();
        }}
        title="Delete this conversation?"
        body="This removes the thread and related data. This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

function MessageRow({ msg }: { msg: ConversationMessage }) {
  const isEva = msg.role === "eva";
  return (
    <div className="flex gap-3">
      <div
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center border"
        style={{
          background: isEva ? "var(--primary)" : "var(--muted)",
          borderColor: "var(--border)",
          color: isEva ? "var(--primary-foreground)" : "var(--foreground)",
        }}
      >
        {isEva ? (
          <Sparkles className="h-3.5 w-3.5" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[10px] font-semibold tracking-[0.18em] uppercase"
            style={{ color: "var(--foreground)" }}
          >
            {isEva ? "EVA" : "You"}
          </span>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: "var(--muted-foreground)" }}
          >
            {relativeTime(msg.at)}
          </span>
        </div>
        <p
          className="mt-1 text-sm leading-relaxed"
          style={{ color: "var(--foreground)" }}
        >
          {msg.content}
        </p>
        {msg.learnedPreferenceLabel && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase"
            style={{
              borderColor: "var(--border)",
              background: "var(--accent-soft)",
              color: "var(--primary)",
            }}
          >
            <Sparkles className="h-2.5 w-2.5" />
            Learned: {msg.learnedPreferenceLabel}
          </div>
        )}
      </div>
    </div>
  );
}
