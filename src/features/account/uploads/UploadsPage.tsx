"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import { AccountInspector } from "@/features/account/primitives/AccountInspector";

type UploadListItem = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  source: string;
  projectId: string | null;
  projectName: string | null;
  createdAt: string;
};

type Sort = "Newest" | "Oldest";

function statusBadge(status: string): { label: string; variant: string } {
  const normalized = status.toLowerCase();
  if (normalized === "ready" || normalized === "analyzed") {
    return { label: "Analyzed", variant: "on" };
  }
  return { label: "Pending", variant: "" };
}

function analysisCopy(item: UploadListItem): string {
  const room = item.projectName ?? item.filename;
  if (item.status.toLowerCase() === "ready") {
    return `Eva: analysis ready for ${room}. Open the file to review lighting, layout, and furniture gaps.`;
  }
  return "Eva: still analyzing this room.";
}

/**
 * Route-owned Uploads list — studio log markup, real upload APIs.
 */
export function UploadsPage({
  initialItems,
}: {
  initialItems: UploadListItem[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sort, setSort] = useState<Sort>("Newest");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? items.filter((item) => {
          const hay = [
            item.filename,
            item.projectName ?? "",
            analysisCopy(item),
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(needle);
        })
      : items;
    const ordered = [...filtered].sort((a, b) =>
      sort === "Newest"
        ? a.createdAt < b.createdAt
          ? 1
          : -1
        : a.createdAt > b.createdAt
          ? 1
          : -1,
    );
    return ordered;
  }, [items, query, sort]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function handleUpload(file: File) {
    if (busy) return;
    setBusy(true);
    try {
      const form = new FormData();
      // Prefer a real MIME when the browser File omits type (Playwright/synthetic).
      const typed =
        file.type && file.type !== "application/octet-stream"
          ? file
          : new File([file], file.name, {
              type: file.name.toLowerCase().endsWith(".txt")
                ? "text/plain"
                : file.type || "application/octet-stream",
            });
      form.append("file", typed);
      const created = await accountRequest<{
        id: string;
        filename: string;
        mimeType: string;
        sizeBytes: number;
        status: string;
        projectName: string | null;
        createdAt: string;
      }>("/api/account/uploads", { method: "POST", body: form });
      setItems((prev) => [
        {
          id: created.id,
          filename: created.filename,
          mimeType: created.mimeType,
          sizeBytes: created.sizeBytes,
          status: created.status,
          source: "user_upload",
          projectId: null,
          projectName: created.projectName,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      flash("Saved ✓");
      router.refresh();
    } catch {
      flash("Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await accountRequest(`/api/account/uploads/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
      flash("Removed ✓");
      router.refresh();
    } catch {
      flash("Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountWireFrame
      inspector={
        selected ? (
          <AccountInspector
            open
            eye="Room photo"
            title={selected.projectName ?? selected.filename}
            onClose={() => setSelectedId(null)}
            actions={
              <>
                <a
                  className="wf-btn"
                  href={`/api/account/uploads/${selected.id}/download`}
                >
                  Download
                </a>
                <button
                  type="button"
                  className="wf-btn ghost"
                  disabled={busy}
                  onClick={() => void handleDelete(selected.id)}
                >
                  Delete
                </button>
              </>
            }
          >
            <div className="wf-insp__img" />
            <p className="wf-field__lbl" style={{ marginTop: 16 }}>
              Eva’s analysis
            </p>
            <p className="wf-insp__p">{analysisCopy(selected)}</p>
          </AccountInspector>
        ) : null
      }
    >
      <AccountWireHeader
        eyebrow="Design Work"
        title="Uploads"
        subtitle="Photos you’ve shared with Eva, with her analysis attached."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <button
              type="button"
              className="wf-btn ghost"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Share in Eva
            </button>
          </>
        }
      />

      <div className="wf-toolrow">
        <div className="wf-search">
          <svg viewBox="0 0 16 16">
            <circle cx="7" cy="7" r="4.2" />
            <path d="M10.2 10.2L14 14" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by room, filename, analysis…"
            aria-label="Search uploads"
          />
        </div>
        <div className="wf-tools" style={{ margin: 0 }}>
          {(["Newest", "Oldest"] as const).map((chip) => (
            <button
              key={chip}
              type="button"
              className={sort === chip ? "wf-chip on" : "wf-chip"}
              onClick={() => setSort(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="wf-list wf-list--media">
          {rows.map((item) => {
            const badge = statusBadge(item.status);
            return (
              <div
                className="wf-row"
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(item.id);
                  }
                }}
              >
                <div className="wf-row__thumb" aria-hidden="true" />
                <div className="wf-row__main">
                  <div className="wf-row__top">
                    <span className="wf-row__t">
                      {item.projectName ?? item.filename}
                    </span>
                    <span
                      className={
                        badge.variant
                          ? `wf-badge wf-badge--${badge.variant}`
                          : "wf-badge"
                      }
                    >
                      {badge.label}
                    </span>
                  </div>
                  <span className="wf-row__p wf-row__p--wrap">
                    {analysisCopy(item)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="wf-blank">
          <p className="wf-blank__t">No uploads yet</p>
          <p className="wf-blank__p">
            Share a photo or file with Eva, or upload one here.
          </p>
        </div>
      )}

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
