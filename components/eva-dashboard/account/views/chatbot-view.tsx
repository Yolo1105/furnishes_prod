"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Sparkles, Send, BookOpen } from "lucide-react";
import {
  PageHeader,
  Eyebrow,
  Button,
  Textarea,
} from "@/components/eva-dashboard/account/shared";

/**
 * Resolved on the server — keeps mock-data (and heavy fixtures) off the client bundle.
 */
export type ChatbotInitialContext =
  | {
      status: "conversation";
      title: string;
      conversationId: string;
    }
  | { status: "playbook"; title: string }
  | {
      status: "invalid";
      conversationQuery?: string;
      playbookQuery?: string;
    }
  | { status: "none" };

/**
 * /chatbot — Eva workspace (live assistant shell).
 */
export function ChatbotView({ context }: { context: ChatbotInitialContext }) {
  const [draft, setDraft] = useState("");

  const showBanner = context.status !== "none";

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col px-6 py-6 sm:px-8 md:py-8 lg:px-10">
      <PageHeader
        eyebrow="EVA"
        title="Design chat"
        subtitle="Brief rooms, refine style, and shortlist pieces — Eva keeps your Studio profile in sync."
      />

      {showBanner && (
        <div
          className="mb-6 border p-4"
          style={{
            background: "var(--card-soft)",
            borderColor: "var(--border)",
          }}
        >
          {context.status === "conversation" ? (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <Eyebrow>CONTINUING THREAD</Eyebrow>
              </div>
              <p
                className="font-body mt-2 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {context.title}
              </p>
              <Link
                href={`/account/conversations/${encodeURIComponent(context.conversationId)}`}
                className="font-ui mt-3 inline-flex text-[10px] tracking-[0.14em] uppercase underline-offset-4 transition-opacity hover:opacity-70"
                style={{ color: "var(--primary)" }}
              >
                View transcript in Studio
              </Link>
            </>
          ) : context.status === "playbook" ? (
            <>
              <div className="flex items-center gap-2">
                <BookOpen
                  className="h-4 w-4 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <Eyebrow>PLAYBOOK CONTEXT</Eyebrow>
              </div>
              <p
                className="font-body mt-2 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {context.title}
              </p>
            </>
          ) : context.status === "invalid" ? (
            <>
              <Eyebrow>LINK CONTEXT</Eyebrow>
              <p
                className="font-body mt-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {context.conversationQuery &&
                  `No fixture conversation “${context.conversationQuery}”. Start chatting — when the live API lands, this ID will resolve.`}
                {context.conversationQuery && context.playbookQuery ? " " : ""}
                {context.playbookQuery &&
                  `No fixture playbook “${context.playbookQuery}”.`}
              </p>
            </>
          ) : null}
        </div>
      )}

      <div
        className="flex min-h-[min(420px,50dvh)] flex-1 flex-col border"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <Sparkles
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--primary)" }}
          />
          <span
            className="font-ui text-[11px] tracking-[0.14em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Messages (preview)
          </span>
        </div>

        <div
          className="font-body flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          <p>
            Eva&apos;s live assistant UI will appear here. Links from Studio now
            resolve to this route so you can wire streaming and tools next.
          </p>
        </div>

        <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Message Eva…"
            className="w-full"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="primary"
              disabled={!draft.trim()}
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => setDraft("")}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
