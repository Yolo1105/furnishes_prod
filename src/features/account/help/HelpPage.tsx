"use client";

import { useMemo, useState } from "react";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

const TOPICS = [
  {
    t: "How Eva builds your style profile",
    d: "From your quiz, recent chats, and saved pieces, and how to read what she infers about your taste.",
    go: "Read ↗",
  },
  {
    t: "Editing what Eva remembers",
    d: "Review, correct, or remove any taste signal Eva has picked up from your activity.",
    go: "Read ↗",
  },
  {
    t: "Delivery & returns in Singapore",
    d: "Typical timelines and fees, plus how to start a return on any order.",
    go: "Read ↗",
  },
  {
    t: "Sharing a project with others",
    d: "Invite collaborators and control exactly what they can see and edit.",
    go: "Read ↗",
  },
] as const;

type FeedbackMode = "feedback" | "problem" | null;

/**
 * Route-owned Customer Service — studio cell markup, real help API submit.
 */
export function HelpPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<FeedbackMode>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [article, setArticle] = useState<(typeof TOPICS)[number] | null>(null);

  const topics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TOPICS;
    return TOPICS.filter(
      (topic) =>
        topic.t.toLowerCase().includes(needle) ||
        topic.d.toLowerCase().includes(needle),
    );
  }, [query]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed || !mode || busy) return;
    setBusy(true);
    try {
      await accountRequest<{ id: string }>("/api/account/help", {
        method: "POST",
        body: JSON.stringify({
          category: mode === "problem" ? "problem" : "feedback",
          message: trimmed,
        }),
      });
      setMessage("");
      setMode(null);
      flash("Saved ✓");
    } catch {
      flash("Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Support"
        title="Customer Service"
        subtitle="Find answers, or tell us what could be better."
      />

      <div className="wf-conn wf-conn--top">
        <label className="wf-helpsearch">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.2" />
            <path d="M10.2 10.2L14 14" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help articles…"
            aria-label="Search help articles"
          />
        </label>

        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}
        >
          <div
            className="wf-cellbox wf-cellbox--band wf-cellbox--band-slim"
            style={{ gridColumn: "1/-1" }}
          >
            <p className="wf-sec__lbl">Popular topics</p>
            <p className="wf-led__intro">
              The guides people open most, short reads written by the team.
            </p>
          </div>
          {topics.map((topic) => (
            <button
              type="button"
              className="wf-cellbox"
              key={topic.t}
              onClick={() => {
                setArticle(topic);
                setMode(null);
              }}
            >
              <div className="wf-cellbox__t">{topic.t}</div>
              <div className="wf-cellbox__d">{topic.d}</div>
              <div className="wf-cellbox__go">{topic.go}</div>
            </button>
          ))}
          {topics.length % 2 === 1 ? (
            <div className="wf-cellbox wf-cellbox--empty" />
          ) : null}
        </div>

        <div
          className="wf-cells wf-cells--flush"
          style={{
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            marginTop: 18,
          }}
        >
          <div
            className="wf-cellbox wf-cellbox--band wf-cellbox--band-slim"
            style={{ gridColumn: "1/-1" }}
          >
            <p className="wf-sec__lbl">Feedback</p>
            <p className="wf-led__intro">
              Reach a real person, or tell us what to build next.
            </p>
          </div>
          <button
            type="button"
            className="wf-cellbox"
            onClick={() => {
              setMode("feedback");
              setArticle(null);
            }}
          >
            <div className="wf-cellbox__t">Send feedback</div>
            <div className="wf-cellbox__d">
              Tell us what’s working and what isn’t, it shapes what we build
              next.
            </div>
            <div className="wf-cellbox__go">Open ↗</div>
          </button>
          <button
            type="button"
            className="wf-cellbox"
            onClick={() => {
              setMode("problem");
              setArticle(null);
            }}
          >
            <div className="wf-cellbox__t">Report a problem</div>
            <div className="wf-cellbox__d">
              Something broken or behaving oddly? Let the team know.
            </div>
            <div className="wf-cellbox__go">Open ↗</div>
          </button>
          <a className="wf-cellbox" href="mailto:help@furnishes.studio">
            <div className="wf-cellbox__t">Email support</div>
            <div className="wf-cellbox__d">
              help@furnishes.studio · a person replies within a day.
            </div>
            <div className="wf-cellbox__go">Email ↗</div>
          </a>
        </div>

        {article ? (
          <div className="wf-conn" style={{ marginTop: 28 }}>
            <p className="wf-sec__lbl">Help article</p>
            <h2 className="wf-insp__t">{article.t}</h2>
            <p className="wf-insp__p">{article.d}</p>
            <p className="wf-insp__p">
              This guide walks through it step by step, or ask Eva in chat and
              she’ll do it for you.
            </p>
            <div className="wf-insp__act">
              <button
                type="button"
                className="wf-btn"
                onClick={() => {
                  flash("Feedback noted");
                  setArticle(null);
                }}
              >
                Mark helpful
              </button>
              <button
                type="button"
                className="wf-btn ghost"
                onClick={() => setArticle(null)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        {mode ? (
          <div className="wf-conn" style={{ marginTop: 28 }}>
            <p className="wf-sec__lbl">
              {mode === "problem" ? "Report a problem" : "Send feedback"}
            </p>
            <div className="wf-efields">
              <label className="wf-efield">
                <span className="wf-efield__l">Message</span>
                <textarea
                  className="wf-input"
                  style={{ minHeight: 96, height: "auto", resize: "vertical" }}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us what’s going on…"
                />
              </label>
            </div>
            <div className="wf-insp__act">
              <button
                type="button"
                className="wf-btn"
                disabled={busy || !message.trim()}
                onClick={() => void handleSubmit()}
              >
                Send
              </button>
              <button
                type="button"
                className="wf-btn ghost"
                onClick={() => setMode(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className={`wf-toast${toast ? " show" : ""}`} hidden={!toast}>
        {toast ?? ""}
      </div>
    </AccountWireFrame>
  );
}
