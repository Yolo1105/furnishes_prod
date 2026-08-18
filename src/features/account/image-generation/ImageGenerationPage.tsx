"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import {
  altTextFromPrompt,
  errorCopyForCode,
  nextPollDelayMs,
  shouldPoll,
} from "@/features/account/image-generation/image-generation-state";
import { isActiveStatus } from "@/features/account/image-generation/image-generation-types";

type GenerationItem = {
  id: string;
  prompt: string;
  negativePrompt: string | null;
  status: string;
  provider: string;
  width: number;
  height: number;
  projectId: string | null;
  projectName: string | null;
  outputUploadId: string | null;
  outputFilename: string | null;
  outputMimeType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type EvaLine = { me?: boolean; text: string };

const DEFAULT_PROMPT = "Oak sofa, oatmeal rug, soft afternoon light…";

/**
 * Route-owned Image Gen — studio 3-col markup, real generation APIs + poll.
 */
export function ImageGenerationPage({
  initialItems,
}: {
  initialItems: GenerationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(
    initialItems[0]?.id ?? null,
  );
  const [prompt, setPrompt] = useState(
    initialItems[0]?.prompt || DEFAULT_PROMPT,
  );
  const [room] = useState("Living room");
  const [style] = useState("Warm minimalist");
  const [aspect] = useState("3 : 2");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [evaLines, setEvaLines] = useState<EvaLine[]>([
    {
      text: "Warmed the lighting and swapped in your saved sofa.",
    },
    { me: true, text: "Add a floor lamp on the left." },
  ]);
  const pollAttemptRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);

  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  useEffect(() => {
    setItems(initialItems);
    if (!activeId && initialItems[0]) {
      setActiveId(initialItems[0].id);
    }
  }, [initialItems, activeId]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1500);
  }

  function upsert(generation: GenerationItem) {
    setItems((prev) => {
      const without = prev.filter((item) => item.id !== generation.id);
      return [generation, ...without];
    });
    setActiveId(generation.id);
  }

  const clearPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refreshGeneration = useEffectEvent(async (id: string) => {
    try {
      const next = await accountRequest<GenerationItem>(
        `/api/account/image-generations/${id}/refresh`,
        { method: "POST" },
      );
      upsert(next);
      if (!isActiveStatus(next.status)) {
        pollAttemptRef.current = 0;
        if (next.status === "ready") {
          setEvaLines((prev) => [
            ...prev,
            { text: "Render is ready — open the canvas to review it." },
          ]);
          flash("Saved ✓");
        } else if (next.status === "failed") {
          flash(
            errorCopyForCode(
              next.errorCode,
              next.errorMessage ?? "Generation failed",
            ),
          );
        }
        router.refresh();
      }
      return next;
    } catch {
      flash("Could not refresh");
      return null;
    }
  });

  useEffect(() => {
    clearPoll();
    if (!active || !shouldPoll(active.status, document.hidden)) {
      return;
    }

    const schedule = () => {
      const delay = nextPollDelayMs(pollAttemptRef.current);
      pollTimerRef.current = window.setTimeout(() => {
        void (async () => {
          const next = await refreshGeneration(active.id);
          pollAttemptRef.current += 1;
          if (next && shouldPoll(next.status, document.hidden)) {
            schedule();
          }
        })();
      }, delay);
    };

    const onVisibility = () => {
      clearPoll();
      if (active && shouldPoll(active.status, document.hidden)) {
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearPoll();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, clearPoll]);

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setEvaLines((prev) => [...prev, { me: true, text: trimmed }]);
    try {
      const created = await accountRequest<GenerationItem>(
        "/api/account/image-generations",
        {
          method: "POST",
          body: JSON.stringify({
            prompt: trimmed,
            width: 768,
            height: 768,
          }),
        },
      );
      pollAttemptRef.current = 0;
      upsert(created);
      setEvaLines((prev) => [
        ...prev,
        {
          text:
            created.status === "ready"
              ? "Here’s your render — warmed lighting and your prompt applied."
              : "Working on your render…",
        },
      ]);
      if (created.status === "ready") flash("Saved ✓");
      router.refresh();
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Could not generate";
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : null;
      flash(errorCopyForCode(code, message));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!active || busy || !isActiveStatus(active.status)) return;
    setBusy(true);
    try {
      const canceled = await accountRequest<GenerationItem>(
        `/api/account/image-generations/${active.id}/cancel`,
        { method: "POST" },
      );
      upsert(canceled);
      flash("Stopped");
      router.refresh();
    } catch {
      flash("Could not cancel");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (
      !active ||
      busy ||
      (active.status !== "failed" && active.status !== "canceled")
    ) {
      return;
    }
    setBusy(true);
    try {
      const retried = await accountRequest<GenerationItem>(
        `/api/account/image-generations/${active.id}/retry`,
        { method: "POST" },
      );
      pollAttemptRef.current = 0;
      upsert(retried);
      flash("Retrying…");
      router.refresh();
    } catch {
      flash("Could not retry");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!active || busy) return;
    setBusy(true);
    try {
      await accountRequest(`/api/account/image-generations/${active.id}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((item) => item.id !== active.id));
      setActiveId(null);
      flash("Removed ✓");
      router.refresh();
    } catch {
      flash("Could not delete");
    } finally {
      setBusy(false);
    }
  }

  const canvasContent = (() => {
    if (!active) {
      return <span className="wf-eye">Generated render</span>;
    }
    if (active.status === "ready" && active.outputUploadId) {
      return (
        <img
          src={`/api/account/uploads/${active.outputUploadId}/download`}
          alt={altTextFromPrompt(active.prompt)}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      );
    }
    if (isActiveStatus(active.status)) {
      return <span className="wf-eye">Generating…</span>;
    }
    if (active.status === "failed") {
      return (
        <span className="wf-eye">
          {errorCopyForCode(
            active.errorCode,
            active.errorMessage ?? "Generation failed",
          )}
        </span>
      );
    }
    if (active.status === "canceled") {
      return <span className="wf-eye">Canceled</span>;
    }
    return <span className="wf-eye">Generated render</span>;
  })();

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Design Work"
        title="Image Gen"
        subtitle="Generate and edit room visuals with Eva."
      />

      <div className="wf-3col">
        <div className="wf-3col__l">
          <p className="wf-eye">Controls</p>
          <div className="wf-field">
            <span className="wf-field__lbl">Room</span>
            <span className="wf-field__val">{room}</span>
          </div>
          <div className="wf-field">
            <span className="wf-field__lbl">Style</span>
            <span className="wf-field__val">{style}</span>
          </div>
          <div className="wf-field">
            <span className="wf-field__lbl">Aspect</span>
            <span className="wf-field__val">{aspect}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="wf-field__lbl">Prompt</span>
            <textarea
              className="wf-input"
              style={{
                height: "auto",
                minHeight: 54,
                marginTop: 8,
                padding: 8,
                resize: "vertical",
              }}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div>
          <div className="wf-canvas">{canvasContent}</div>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="wf-btn"
              disabled={busy || !prompt.trim()}
              onClick={() => void handleGenerate()}
            >
              Generate
            </button>
            {active && isActiveStatus(active.status) ? (
              <button
                type="button"
                className="wf-chip"
                disabled={busy}
                onClick={() => void handleCancel()}
              >
                Stop
              </button>
            ) : null}
            {active &&
            (active.status === "failed" || active.status === "canceled") ? (
              <button
                type="button"
                className="wf-chip"
                disabled={busy}
                onClick={() => void handleRetry()}
              >
                Retry
              </button>
            ) : null}
            <span className="wf-chip">4 variations</span>
            <span className="wf-chip">Edit region</span>
            {active ? (
              <button
                type="button"
                className="wf-chip"
                disabled={busy}
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            ) : null}
          </div>
          {items.length > 0 ? (
            <div className="wf-tools" style={{ marginTop: 16 }}>
              {items.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === active?.id ? "wf-chip on" : "wf-chip"}
                  onClick={() => {
                    setActiveId(item.id);
                    setPrompt(item.prompt);
                  }}
                >
                  {item.status}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="wf-3col__r">
          <p className="wf-eye">Eva</p>
          {evaLines.map((line, index) => (
            <div
              key={`${index}-${line.text.slice(0, 12)}`}
              className={line.me ? "wf-msg me" : "wf-msg"}
            >
              <span className="wf-msg__role">{line.me ? "You" : "Eva"}</span>
              <span className="wf-msg__txt">{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
