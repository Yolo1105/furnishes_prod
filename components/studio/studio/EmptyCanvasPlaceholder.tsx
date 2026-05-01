"use client";

import { useStore } from "@studio/store";
import { selectCurrentProjectConversations } from "@studio/store/chat-slice";
import { SparkleIcon } from "@studio/icons";

/**
 * EmptyCanvasPlaceholder — soft hero card centered in the viewport
 * when the scene has nothing to show AND the user hasn't started
 * working yet.
 *
 * Self-gates render on a stricter set of conditions than v0.40.8.
 * The earlier version showed whenever the scene was empty, which
 * created a layered mess in the UI: while a Room Layout generation
 * was in flight (5–15s), the scene was technically still empty
 * (Claude hadn't returned yet), so the hero rendered alongside the
 * conversation switcher and thinking log — three vertically-centered
 * elements competing for the same band. The user reported it as
 * "everything overlaps."
 *
 * The new gates require ALL of:
 *
 *   1. sceneSource is "room-director" (no apartamento.glb mounted)
 *   2. roomMeta is null (no generated room shell)
 *   3. furniture array is empty (no placed pieces)
 *   4. NOT isGenerating (the user isn't mid-turn waiting for output)
 *   5. The current project's conversations have zero turns combined
 *      (the user hasn't had a single back-and-forth with the
 *      assistant in this project yet)
 *
 * Conditions 4 and 5 mean the hero appears ONLY in the genuine
 * "I just opened the app, what do I do" state. After the user's
 * first turn, even if it's still in flight or the result didn't
 * land yet, the hero stays hidden. After a successful turn, the
 * hero stays hidden because furniture/roomMeta have populated.
 *
 * Pointer-events: none. The 3D viewport sits underneath at z=1, the
 * placeholder at z=2 — but the placeholder is non-interactive so the
 * user can still orbit/click whatever's in the scene. The text
 * inside the card has its own `pointer-events: auto` so the user
 * could in principle make a child clickable (e.g. example prompts
 * that fill the chat input); for v1 the hero is purely decorative.
 *
 * Visual rhythm: matches the empty-state style used by InventoryCard,
 * GenerationsCard, and FloorPlan2D's "Floor plan preview" placeholder
 * (two-line layout, soft fade-in). Uses --font-app (Syne) like every
 * other studio surface.
 */

const ACCENT = "#FF5A1F";
const INK = "#1A1A1A";

export function EmptyCanvasPlaceholder() {
  const sceneSource = useStore((s) => s.sceneSource);
  const roomMeta = useStore((s) => s.roomMeta);
  const furnitureCount = useStore(
    (s) => (s.furniture ?? []).filter((f) => f.placed).length,
  );
  // Hide while a generation is in flight — otherwise the hero
  // overlaps with the conversation switcher + thinking log during
  // the 5–15s wait after the user submits a prompt.
  const isGenerating = useStore((s) => {
    return Boolean((s as unknown as { isGenerating?: boolean }).isGenerating);
  });
  // v0.40.46: also hide on isThinking — covers the Interior Design
  // (chat-mode) path where isGenerating stays false but the user
  // has clearly started working. Without this gate, sending a
  // prompt in chat mode kept the instruction page visible behind
  // the ThinkingLog: three things competing for the center band
  // (instructions, thinking log, eventually scene).
  const isThinking = useStore((s) => Boolean(s.isThinking));
  // v0.40.46: also hide as soon as the user types and presses Send,
  // before the turn lands in the conversation. There's a window
  // between sendMessage() (which sets pendingUserText) and the
  // first turn appearing in `conversations` where neither
  // hasConversation nor isThinking might be true yet — relying on
  // any one of these alone leaves a flicker. Belt-and-braces.
  const pendingUserText = useStore(
    (s) => (s as unknown as { pendingUserText?: string }).pendingUserText ?? "",
  );
  // Hide once the user has any turn history in the current project.
  // Even if the scene is still empty (e.g. a Room Layout error left
  // furniture: []), the conversation context means the user is past
  // the genuine empty-canvas moment.
  const hasConversation = useStore((s) => {
    const convos = selectCurrentProjectConversations(
      s as unknown as Parameters<typeof selectCurrentProjectConversations>[0],
    );
    return convos.some((c) => Array.isArray(c.turns) && c.turns.length > 0);
  });
  // setMessage — used by clickable example chips below to populate
  // the chat input on click. Decoupling the chip's onClick from the
  // chat dock via the store means the placeholder doesn't need a
  // ref or context — it just writes to the same state the textarea
  // reads from.
  const setMessage = useStore(
    (s) => (s as unknown as { setMessage: (m: string) => void }).setMessage,
  );

  const isEmpty =
    sceneSource === "room-director" &&
    roomMeta === null &&
    furnitureCount === 0 &&
    !isGenerating &&
    !isThinking &&
    !pendingUserText &&
    !hasConversation;

  // v0.40.46: instead of `if (!isEmpty) return null`, keep the
  // component mounted and animate opacity. When the user sends a
  // prompt, the instruction page fades up and out over 280ms while
  // the ThinkingLog fades in below — clean handoff between the
  // "what to do" state and the "doing it" state, no overlap. When
  // a generation finishes (scene populates), the placeholder stays
  // hidden because furnitureCount or roomMeta is now non-empty.
  // pointerEvents flips to "none" the instant we leave the empty
  // state so the dimmed placeholder doesn't intercept clicks during
  // the fade-out.

  return (
    <div
      aria-hidden={!isEmpty}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 2,
        opacity: isEmpty ? 1 : 0,
        // Subtle upward translate on exit — feels like the page
        // "lifts away" to reveal the work surface beneath. On enter
        // (rare; would only fire if the user reset everything) we
        // fall through to the keyframe animation defined below.
        transform: isEmpty ? "translateY(0)" : "translateY(-8px)",
        transition:
          "opacity 280ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        // Fade in over ~600ms after first paint so the placeholder
        // doesn't pop in immediately — gives the staggered-mount
        // sequence a moment to land first. Only runs once on mount;
        // subsequent show/hides use the transition above instead.
        animation: isEmpty
          ? "empty-canvas-fade-in 600ms cubic-bezier(0.22, 1, 0.36, 1) 800ms both"
          : undefined,
        fontFamily: "var(--font-app), system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes empty-canvas-fade-in {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes empty-canvas-icon-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .empty-canvas-icon { animation: none !important; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 480,
          padding: "32px 40px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          // Hero is intentionally NOT a glass card — it would compete
          // with the actual tool cards. A soft drop shadow + accent
          // ring around the icon is enough visual presence.
          // pointer-events: auto re-enables clicks on the inner card
          // (the wrapper has pointer-events: none so the rest of the
          // viewport stays interactive). Children that should remain
          // non-interactive don't need to do anything; clickable
          // children (chips) work because pointer-events: auto cascades.
          //
          // v0.40.46: only "auto" while genuinely empty. Once the
          // user sends a prompt and we begin fading out, flip to
          // "none" so the dimmed-but-still-visible placeholder
          // doesn't intercept a click meant for the scene below.
          pointerEvents: isEmpty ? "auto" : "none",
        }}
      >
        <div
          className="empty-canvas-icon"
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "rgba(255, 90, 31, 0.1)",
            border: "1px solid rgba(255, 90, 31, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: ACCENT,
            animation: "empty-canvas-icon-pulse 3.4s ease-in-out infinite",
          }}
        >
          <SparkleIcon size={22} />
        </div>

        {/* v0.40.43 typographic system: a clear 4-tier hierarchy.
            EYEBROW (10/uppercase/600/letter-spaced) — labels the
            surface and gives the studio a small-caps signature.
            HERO   (28/600)                          — the headline.
            BODY   (18/400/1.55)                     — the instruction.
            CHIP   (14/500)                          — the examples.
            Scale 28→18→14→12→10 is intentionally tight at the small
            end (where readability matters) and wider at the top
            (where presence matters). 28/18 = 1.56 gives the hero a
            clear moment without overwhelming surrounding chrome.
            14/12 = 1.17 keeps reading flow intact across body sizes. */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "rgba(26, 26, 26, 0.5)",
          }}
        >
          Furnishes Studio
        </div>

        <h2
          style={{
            margin: 0,
            // v0.40.43: 26 → 28. The 1.56× jump from body lets the
            // hero own the page without competing with the toolbar
            // or the tool menu. Tighter line-height (1.1 from 1.15)
            // and slightly more aggressive letter-spacing (-0.02em
            // from -0.015em) give it editorial confidence at this
            // larger size.
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: INK,
          }}
        >
          Begin a room, or a piece
        </h2>

        <p
          style={{
            margin: 0,
            // v0.40.43: 14 → 18. The previous 14px sat too close to
            // the 11px chip text and the two blurred together while
            // scanning. 18px gives body a clear tier above chips
            // (14px now) and below the hero (28px).
            fontSize: 18,
            lineHeight: 1.55,
            color: "rgba(26, 26, 26, 0.65)",
            maxWidth: 380,
          }}
        >
          Describe what you&rsquo;re working on. We&rsquo;ll draft a starting
          point and refine from there.
        </p>

        {/* v0.40.43: four chips instead of two. Two room-scale + two
            piece-scale, with one HDB-flavored chip that nudges the
            user toward the housing-profile feature. The chip set is
            wide enough that the user can pick the closest match
            instead of inventing wording from scratch. */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 420,
          }}
        >
          {[
            "A 4×5m mid-century bedroom",
            "A Singapore HDB living-dining room",
            "A walnut reading chair",
            "A modular sofa for a narrow space",
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => {
                // Fill the chat input with the chip's text and focus
                // the textarea so the user can edit before sending.
                // This converts the chips from decorative placeholders
                // (where they previously looked clickable but did
                // nothing — a false affordance) into a real one-tap
                // path from "I don't know what to write" to "here's
                // a starting prompt I can adjust." We deliberately
                // don't auto-submit — the user might want to tweak
                // the example before committing.
                setMessage(hint);
                // Focus the textarea. The chat input may not be
                // mounted yet on first paint, so query for it after
                // the state update lands. This is a one-shot effect
                // so we don't bother with a ref through context.
                setTimeout(() => {
                  const ta = document.querySelector<HTMLTextAreaElement>(
                    "textarea.chat-textarea",
                  );
                  ta?.focus();
                }, 0);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background: "rgba(26, 26, 26, 0.04)",
                border: "1px solid rgba(26, 26, 26, 0.08)",
                // v0.40.43: 11 → 14 to match body's lower tier of
                // the new 28→18→14→12→10 scale. Also makes the
                // tap target friendlier on touch.
                fontSize: 14,
                color: "rgba(26, 26, 26, 0.7)",
                fontFamily: "var(--font-app), system-ui, sans-serif",
                cursor: "pointer",
                transition:
                  "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(26, 26, 26, 0.08)";
                e.currentTarget.style.borderColor = "rgba(26, 26, 26, 0.18)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(26, 26, 26, 0.04)";
                e.currentTarget.style.borderColor = "rgba(26, 26, 26, 0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
