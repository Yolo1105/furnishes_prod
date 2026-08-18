"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";
import { AccountInspector } from "@/features/account/primitives/AccountInspector";
import { inspirationCardTitle } from "@/features/account/inspiration/inspiration-state";
import type { InspirationDto } from "@/features/account/inspiration/inspiration-types";

const CATALOG = [
  {
    id: "ph-sofa",
    name: "Söderhamn 3-seat sofa",
    meta: "Sofa · Nordic Living · S$1,295",
  },
  {
    id: "ph-rug",
    name: "Ferm Living flatweave rug",
    meta: "Rug · Studio Import · S$420",
  },
  {
    id: "ph-lamp",
    name: "Anglepoise task lamp",
    meta: "Lighting · Anglepoise · S$310",
  },
  {
    id: "ph-console",
    name: "Oak console, low profile",
    meta: "Storage · Local maker · S$680",
  },
  {
    id: "ph-chair",
    name: "Wishbone dining chair",
    meta: "Seating · Carl Hansen · S$890",
  },
  {
    id: "ph-side",
    name: "Clay side table",
    meta: "Table · Local maker · S$240",
  },
] as const;

function groupItems(items: InspirationDto[]) {
  const groups = new Map<string, InspirationDto[]>();
  for (const item of items) {
    const key = item.projectName?.trim() || "Unassigned";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()];
}

function priceSlot(item: InspirationDto): string {
  if (item.note?.trim() && /\$|S\$/.test(item.note)) return item.note.trim();
  if (item.roomLabel?.trim()) return item.roomLabel.trim();
  if (item.note?.trim()) return item.note.trim();
  return item.source === "generated" ? "From Image Gen" : "From Uploads";
}

/**
 * Explore — browse sample pieces and saved inspiration from renders.
 */
export function InspirationPage({
  initialItems,
}: {
  initialItems: InspirationDto[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const groups = useMemo(() => groupItems(items), [items]);

  function flash(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function handleAddPiece() {
    if (busy) return;
    setBusy(true);
    try {
      const listed = await accountRequest<{
        items: Array<{ id: string; status: string }>;
      }>("/api/account/image-generations");
      const ready = listed.items.find((item) => item.status === "ready");
      if (!ready) {
        flash("Generate a render first");
        return;
      }
      const created = await accountRequest<InspirationDto>(
        "/api/account/inspiration",
        {
          method: "POST",
          body: JSON.stringify({
            imageGenerationId: ready.id,
            title: "Saved piece",
          }),
        },
      );
      setItems((prev) => [created, ...prev]);
      setSelectedId(created.id);
      flash("Saved ✓");
      router.refresh();
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
          ? (error as { code: string }).code
          : null;
      flash(code === "duplicate" ? "Already saved" : "Could not add");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await accountRequest(`/api/account/inspiration/${id}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) setSelectedId(null);
      flash("Removed ✓");
      router.refresh();
    } catch {
      flash("Could not remove");
    } finally {
      setBusy(false);
    }
  }

  async function moveToProject(projectId: string | null) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const updated = await accountRequest<InspirationDto>(
        `/api/account/inspiration/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ projectId }),
        },
      );
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      flash("Saved ✓");
      router.refresh();
    } catch {
      flash("Could not move");
    } finally {
      setBusy(false);
    }
  }

  const projectChoices = useMemo(() => {
    const names = new Map<string, string>();
    for (const item of items) {
      if (item.projectId && item.projectName) {
        names.set(item.projectId, item.projectName);
      }
    }
    return [...names.entries()];
  }, [items]);

  return (
    <AccountWireFrame
      inspector={
        selected ? (
          <AccountInspector
            open
            eye="Saved piece"
            title={inspirationCardTitle(selected)}
            onClose={() => setSelectedId(null)}
            actions={
              <button
                type="button"
                className="wf-btn ghost"
                disabled={busy}
                onClick={() => void handleDelete(selected.id)}
              >
                Remove
              </button>
            }
          >
            <div className="wf-insp__img" />
            {selected.note ? (
              <p className="wf-insp__p">{selected.note}</p>
            ) : null}
            <p className="wf-field__lbl" style={{ marginTop: 16 }}>
              Move to project
            </p>
            <div className="wf-choice">
              <span
                className={!selected.projectId ? "on" : undefined}
                role="button"
                tabIndex={0}
                onClick={() => void moveToProject(null)}
              >
                Unassigned
              </span>
              {projectChoices.map(([id, name]) => (
                <span
                  key={id}
                  className={selected.projectId === id ? "on" : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => void moveToProject(id)}
                >
                  {name}
                </span>
              ))}
            </div>
          </AccountInspector>
        ) : null
      }
    >
      <AccountWireHeader
        eyebrow="Design Work"
        title="Explore"
        subtitle="Sample pieces and ideas to browse."
        actions={
          <button
            type="button"
            className="wf-btn"
            disabled={busy}
            onClick={() => void handleAddPiece()}
          >
            + Add from renders
          </button>
        }
      />

      <div className="wf-picks">
        {CATALOG.map((piece) => (
          <div className="wf-pick" key={piece.id}>
            <span className="wf-pick__b">
              <span className="wf-pick__t">{piece.name}</span>
              <span className="wf-pick__m">{piece.meta}</span>
            </span>
          </div>
        ))}
      </div>

      {groups.length
        ? groups.map(([projectName, shelfItems]) => (
            <div className="wf-picks wf-picks--saved" key={projectName}>
              <p className="wf-sec__lbl">
                Saved
                <span className="wf-lblhint">{projectName}</span>
              </p>
              {shelfItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="wf-pick"
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="wf-pick__b">
                    <span className="wf-pick__t">
                      {inspirationCardTitle(item)}
                    </span>
                    <span className="wf-pick__m">{priceSlot(item)}</span>
                  </span>
                  <span className="wf-pick__mark">Open</span>
                </button>
              ))}
            </div>
          ))
        : null}

      <div className={`wf-toast${toast ? " show" : ""}`}>{toast ?? ""}</div>
    </AccountWireFrame>
  );
}
