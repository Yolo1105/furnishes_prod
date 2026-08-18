"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { accountRequest } from "@/features/account/account-api";

import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

const SNAPSHOT: Array<{ label: string; value: string }> = [
  { label: "Style", value: "Warm Minimalist" },
  { label: "Budget", value: "S$15–20k" },
  { label: "Active rooms", value: "4" },
  { label: "Taste signals", value: "6" },
];

type SwitchToggleProps = {
  title: string;
  description: string;
  on: boolean;
  onClick: () => void;
};

function SwitchToggle({ title, description, on, onClick }: SwitchToggleProps) {
  return (
    <button
      type="button"
      className="wf-tog2"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        width: "100%",
        textAlign: "left",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      <div className="wf-tog2__main">
        <div className="wf-tog2__t">{title}</div>
        <div className="wf-tog2__d">{description}</div>
      </div>
      <span className={on ? "wf-switch" : "wf-switch off"} />
    </button>
  );
}

/**
 * Route-owned Privacy page — exact studio markup/classes.
 * Source of truth: approved Account wireframe privacy surface.
 */
export function PrivacyPage({
  initialMemoryEnabled,
}: {
  initialMemoryEnabled: boolean;
}) {
  const [memoryEnabled, setMemoryEnabled] = useState(initialMemoryEnabled);
  const [usesUploads, setUsesUploads] = useState(true);
  const [usesPurchaseHistory, setUsesPurchaseHistory] = useState(true);
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    setMemoryEnabled(initialMemoryEnabled);
  }, [initialMemoryEnabled]);

  function flashToast(text: string) {
    setToastText(text);
    setTimeout(() => setToastText(null), 1500);
  }

  async function handleMemoryToggle() {
    const next = !memoryEnabled;
    setMemoryEnabled(next);
    try {
      await accountRequest("/api/account/privacy/memory", {
        method: "PUT",
        body: JSON.stringify({ memoryEnabled: next }),
      });
    } catch {
      setMemoryEnabled(!next);
    }
  }

  async function downloadFile(url: string, fallbackFilename: string) {
    flashToast("Downloading ✓");
    const response = await fetch(url);
    if (!response.ok) return;
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? fallbackFilename;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleClear() {
    if (!window.confirm("Eva forgets your taste profile and starts fresh")) {
      return;
    }
    try {
      await accountRequest("/api/account/privacy/clear", { method: "POST" });
      flashToast("Removed ✓");
    } catch {
      /* keep silent — no invented error copy */
    }
  }

  async function handleDelete() {
    if (!window.confirm("Permanently remove your account and all data")) {
      return;
    }
    try {
      await accountRequest("/api/account/privacy/delete", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="How Eva Knows Me"
        title="Eva’s memory & data"
        subtitle="What Eva is allowed to remember about you, and how to review, export, or erase it."
      />

      <div className="wf-conn wf-conn--top wf-conn--flat">
        <div
          className="wf-cells wf-cells--flush"
          style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}
        >
          <div
            className="wf-cellbox wf-cellbox--band wf-cellbox--band-slim"
            style={{ gridColumn: "1/-1" }}
          >
            <p className="wf-sec__lbl">What Eva remembers right now</p>
          </div>
          {SNAPSHOT.map((item) => (
            <div className="wf-cellbox" key={item.label}>
              <div className="wf-fact__l">{item.label}</div>
              <div className="wf-fact__v">{item.value}</div>
            </div>
          ))}
        </div>
        <p style={{ marginTop: "13px" }}>
          <Link href="/account/style" className="wf-mem__src">
            Review what Eva remembers ↗
          </Link>
        </p>

        <div className="wf-sec">
          <p className="wf-sec__lbl">What Eva can use</p>
        </div>
        <div className="wf-togblock">
          <SwitchToggle
            title="Remember my taste across sessions"
            description="Eva keeps your style profile and preferences between visits, so you don’t start over each time."
            on={memoryEnabled}
            onClick={handleMemoryToggle}
          />
          <SwitchToggle
            title="Use my uploads to improve recommendations"
            description="Your room photos help Eva learn your space, lighting, and proportions."
            on={usesUploads}
            onClick={() => setUsesUploads((prev) => !prev)}
          />
          <SwitchToggle
            title="Personalize with my purchase history"
            description="Past orders inform what Eva suggests next and what it avoids repeating."
            on={usesPurchaseHistory}
            onClick={() => setUsesPurchaseHistory((prev) => !prev)}
          />
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Your data</p>
        </div>
        <div className="wf-led-list">
          <div className="wf-list">
            <button
              type="button"
              className="wf-row"
              onClick={() =>
                downloadFile(
                  "/api/account/privacy/export",
                  "furnishes-account-export.json",
                )
              }
            >
              <div className="wf-row__main">
                <span className="wf-row__t">Export my data</span>
                <span className="wf-row__p">
                  Download everything Eva knows about you
                </span>
              </div>
              <span className="wf-row__m">Request</span>
            </button>
            <button
              type="button"
              className="wf-row"
              onClick={() =>
                downloadFile(
                  "/api/account/privacy/conversations-export",
                  "furnishes-conversations-export.json",
                )
              }
            >
              <div className="wf-row__main">
                <span className="wf-row__t">Download conversations</span>
                <span className="wf-row__p">
                  All threads with Eva as a file
                </span>
              </div>
              <span className="wf-row__m">Request</span>
            </button>
          </div>
        </div>

        <div className="wf-sec">
          <p className="wf-sec__lbl">Danger zone</p>
        </div>
        <div className="wf-led-list">
          <div className="wf-list">
            <button type="button" className="wf-row" onClick={handleClear}>
              <div className="wf-row__main">
                <span className="wf-row__t">Clear Eva’s memory</span>
                <span className="wf-row__p">
                  Eva forgets your taste profile and starts fresh
                </span>
              </div>
              <span className="wf-row__m">Clear</span>
            </button>
            <button type="button" className="wf-row" onClick={handleDelete}>
              <div className="wf-row__main">
                <span className="wf-row__t">Delete account</span>
                <span className="wf-row__p">
                  Permanently remove your account and all data
                </span>
              </div>
              <span className="wf-row__m">Delete</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`wf-toast${toastText ? " show" : ""}`}>
        {toastText ? `${toastText} ✓` : ""}
      </div>
    </AccountWireFrame>
  );
}
