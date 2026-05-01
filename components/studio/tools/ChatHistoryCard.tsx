"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@studio/store";
import type { Conversation } from "@studio/store/types";
import { useDraggable } from "@studio/hooks/useDraggable";
import { MessageSquareIcon, PlusCircleIcon, CloseIcon } from "@studio/icons";

/**
 * Chat history — floating side card listing every conversation in
 * the current project. Replaces the inline ConversationSwitcher
 * chip that used to sit above the chat dock; lives as a tools-tab
 * card now so multi-conversation management has a more deliberate,
 * less-cramped surface.
 *
 * Layout:
 *   • Header   — `Chat history · N conversations` count. Reads from
 *                the chat slice's per-project conversations selector.
 *                No × button — close via the Chat history tile in
 *                the Tools card (consistent with Inventory / Reference).
 *   • +Row     — orange "+ New conversation" call-to-action. Click
 *                creates a fresh conversation via createConversation()
 *                with an auto-numbered title.
 *   • Divider  — thin separator between actions and the list.
 *   • List     — vertical, scrollable. Each row:
 *                  – Title (Inter 12 600). Click → switch active.
 *                    Double-click → rename (inline input).
 *                  – Subtext: turn count, e.g. "5 messages".
 *                  – ✕ button on hover (only when there are 2+
 *                    conversations — last one can't be deleted).
 *                  – Active conversation gets the accent treatment.
 *
 * Drag/no-drag: card root is draggable via useDraggable("tool-chat-
 * history"). Every interactive child carries data-no-drag so clicks
 * don't start a drag. The scroll region also opts out so the user
 * can scroll a long list without dragging the card.
 *
 * Why a card and not the inline chip:
 *   The chip pattern grew cramped — a long title would overflow,
 *   the dropdown popped over the conversation bubble, and rename
 *   inline editing was tight. Tools-card pattern matches the rest
 *   of the studio (Reference, Inventory) and gives the user space
 *   to actually read a list of conversation titles.
 */

const ACCENT = "#FF5A1F";
const INK = "#1A1A1A";
const UI_FONT = "var(--font-app), system-ui, sans-serif";
const MAX_LIST_HEIGHT = 320;

export function ChatHistoryCard() {
  // Subscribe to PRIMITIVES + RAW arrays only. Deriving the sorted
  // per-project list inside a selector returns a fresh array on every
  // store change, which trips React 18's "getSnapshot should be cached"
  // error and crashes the dev overlay. Read raw fields here, derive
  // the filtered + sorted list with useMemo so the array reference
  // stays stable across renders that don't actually change the inputs.
  const allConversations = useStore(
    (s) =>
      (s as unknown as { conversations?: Conversation[] }).conversations ?? [],
  );
  const currentProjectId = useStore(
    (s) =>
      (s as unknown as { currentProjectId?: string }).currentProjectId ?? null,
  );
  const activeConversationId = useStore((s) => s.activeConversationId);

  const conversations = useMemo(() => {
    if (!currentProjectId) return [] as Conversation[];
    return allConversations
      .filter((c): c is Conversation => !!c && c.projectId === currentProjectId)
      .map((c) =>
        // Defensive: ensure `turns` is always an array. Some legacy
        // snapshots and mid-hydrate states have `turns` as undefined.
        Array.isArray(c.turns) ? c : { ...c, turns: [] },
      )
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  }, [allConversations, currentProjectId]);

  const active = useMemo(
    () =>
      activeConversationId
        ? (conversations.find((c) => c.id === activeConversationId) ?? null)
        : null,
    [conversations, activeConversationId],
  );

  const createConversation = useStore((s) => s.createConversation);
  const selectConversation = useStore((s) => s.selectConversation);
  const deleteConversation = useStore((s) => s.deleteConversation);
  const renameConversation = useStore((s) => s.renameConversation);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus + select the rename input when entering edit mode.
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Top position — measured from whichever left-rail card is the
  // bottommost in the stack so we never overlap.
  // v0.40.29: prefer Inventory (which mounts only when there are
  // placed pieces, sitting BELOW Tools); fall back to Tools when
  // Inventory isn't visible. Previously we anchored only to Tools,
  // which produced an overlap with Inventory whenever the user had
  // pieces in the scene.
  const [topPx, setTopPx] = useState(620); // sensible default until measured
  const [leftPx, setLeftPx] = useState(14);

  useEffect(() => {
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let inv: HTMLElement | null = null;
    let tools: HTMLElement | null = null;

    const settle = () => {
      // Re-query on every settle — Inventory mounts/unmounts based on
      // placed.length > 0, so the anchor target can change between
      // mounts.
      inv = document.querySelector(
        '[data-card-id="tool-inventory"]',
      ) as HTMLElement | null;
      tools = document.querySelector(
        '[data-card-id="tools"]',
      ) as HTMLElement | null;
      const anchor = inv ?? tools;
      if (!anchor) return;

      const measure = () => {
        const r = anchor!.getBoundingClientRect();
        const proposedTop = r.bottom + 6;
        const HISTORY_HEIGHT_GUESS = 280;
        const FOOTER_BUFFER = 100;
        const wouldOverflow =
          proposedTop + HISTORY_HEIGHT_GUESS >
          window.innerHeight - FOOTER_BUFFER;
        if (wouldOverflow) {
          // v0.40.42: same overflow rule as the right rail. Slide
          // RIGHT of the anchor (still on the left half of the
          // viewport) when stacking below would push us off-screen.
          setTopPx(r.top);
          setLeftPx(
            Math.min(r.right + 8, Math.round(window.innerWidth / 2) - 14),
          );
        } else {
          setTopPx(proposedTop);
          setLeftPx(14);
        }
      };
      measure();

      ro?.disconnect();
      ro = new ResizeObserver(measure);
      ro.observe(anchor);
    };

    raf = requestAnimationFrame(settle);
    window.addEventListener("resize", settle);

    // Also observe the document body for child mutations so we
    // catch Inventory mount/unmount events. Cheaper alternatives
    // (e.g. polling) trade a constant CPU cost for a one-shot
    // observer that only fires on actual DOM changes near the
    // left rail.
    const mo = new MutationObserver(settle);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", settle);
    };
  }, []);

  const { onMouseDown, positionStyle } = useDraggable("tool-chat-history");

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingDraft(currentTitle);
  };

  const commitRename = () => {
    if (!editingId) return;
    const trimmed = editingDraft.trim();
    if (trimmed) renameConversation(editingId, trimmed);
    setEditingId(null);
    setEditingDraft("");
  };

  return (
    <aside
      data-card-id="tool-chat-history"
      onMouseDown={onMouseDown}
      style={{
        position: "fixed",
        top: topPx,
        left: leftPx,
        zIndex: 4,
        cursor: "grab",
        transition: "top 0.18s ease, left 0.18s ease",
        ...positionStyle,
      }}
    >
      <div
        className="glass"
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          padding: 10,
          width: 280,
          fontFamily: UI_FONT,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "2px 10px 8px 10px",
            color: INK,
            borderBottom: "1px solid rgba(124, 80, 50, 0.1)",
          }}
        >
          <MessageSquareIcon size={13} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Chat history</span>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontWeight: 500,
              color: "rgba(26, 26, 26, 0.5)",
            }}
          >
            {conversations.length} convo
            {conversations.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* + New conversation row */}
        <button
          type="button"
          onClick={() => createConversation()}
          data-no-drag="true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            marginTop: 4,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: ACCENT,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: UI_FONT,
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255, 90, 31, 0.08)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "transparent")
          }
        >
          <PlusCircleIcon size={13} />
          New conversation
        </button>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(26, 26, 26, 0.06)",
            margin: "4px 6px 6px",
          }}
        />

        {/* Conversation list */}
        <div
          data-no-drag="true"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: MAX_LIST_HEIGHT,
            overflowY: "auto",
            paddingRight: 2,
          }}
        >
          {conversations.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: "rgba(26, 26, 26, 0.5)",
                padding: "10px 10px 6px",
              }}
            >
              No conversations yet — start a new one above.
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = active?.id === c.id;
              const isEditing = c.id === editingId;
              const turnCount = c.turns.length;
              return (
                <div
                  key={c.id}
                  data-no-drag="true"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: isActive
                      ? "rgba(255, 90, 31, 0.1)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(255, 90, 31, 0.2)"
                      : "1px solid transparent",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "rgba(26, 26, 26, 0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingDraft}
                      onChange={(e) => setEditingDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        else if (e.key === "Escape") {
                          setEditingId(null);
                          setEditingDraft("");
                        }
                      }}
                      onBlur={commitRename}
                      data-no-drag="true"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        border: "1px solid rgba(255, 90, 31, 0.4)",
                        borderRadius: 5,
                        padding: "3px 7px",
                        fontSize: 12,
                        fontWeight: 600,
                        background: "rgba(255, 255, 255, 0.95)",
                        color: INK,
                        outline: "none",
                        fontFamily: UI_FONT,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectConversation(c.id)}
                      onDoubleClick={() => startRename(c.id, c.title)}
                      data-no-drag="true"
                      title="Click to switch · double-click to rename"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 1,
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: UI_FONT,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isActive ? ACCENT : INK,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 200,
                        }}
                      >
                        {c.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(26, 26, 26, 0.5)",
                          fontWeight: 500,
                        }}
                      >
                        {turnCount} message{turnCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  )}

                  {!isEditing && conversations.length > 1 && (
                    <button
                      type="button"
                      data-no-drag="true"
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          window.confirm(
                            `Delete "${c.title}"? This can't be undone.`,
                          )
                        ) {
                          deleteConversation(c.id);
                        }
                      }}
                      title="Delete conversation"
                      aria-label={`Delete ${c.title}`}
                      style={{
                        width: 22,
                        height: 22,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "none",
                        borderRadius: 999,
                        background: "transparent",
                        color: "rgba(26, 26, 26, 0.4)",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "background 0.15s ease, color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(204, 34, 34, 0.1)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#cc2222";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "rgba(26, 26, 26, 0.4)";
                      }}
                    >
                      <CloseIcon size={11} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
