"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { accountRequest } from "@/features/account/account-api";
import { getAccountErrorMessage } from "@/features/account/account-errors";
import { useAccountOverlay } from "@/features/account/primitives/useAccountOverlay";
import type {
  ChatConversationDto,
  ChatMessageSource,
} from "./conversation-types";
import type { AssistantPersonaSummary } from "./persona-types";
import type {
  ChatPreferenceCategory,
  ConfirmedPreferenceDto,
  PreferenceProposalDto,
  PreferenceSourceDto,
} from "./preference-types";
import { PersonaButton } from "./personas/PersonaButton";
import { PersonaPicker } from "./personas/PersonaPicker";
import { PreferenceBlock } from "./preferences/PreferenceBlock";
import { PreferenceEditor } from "./preferences/PreferenceEditor";
import { PreferenceProposalCard } from "./preferences/PreferenceProposalCard";
import { PreferenceSourceInspector } from "./preferences/PreferenceSourceInspector";
import {
  joinPreferenceValues,
  splitPreferenceValues,
} from "./preferences/preference-values";
import { ChatSectionView } from "./ChatSectionView";
import { renderAssistantContent } from "./chat-message-content";
import { useChatWorkspace } from "./chat-workspace-context";
import {
  displayConversationTitle,
  needsGeneratedTitle,
  summarizeConversationTitle,
} from "@/lib/conversations/conversation-title";

function preferenceOriginLabel(
  source: string | null | undefined,
): "user" | "chat" | null {
  if (!source) return null;
  return source === "extracted_confirmed" ? "chat" : "user";
}

type PrefKey = ChatPreferenceCategory;

const PREF_META: Array<{
  key: PrefKey;
  icon: ReactNode;
  title: string;
  placeholder: string;
  examples: string[];
}> = [
  {
    key: "room",
    icon: (
      <svg
        className="wf-pref__i"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: "Room Type",
    placeholder: "Tell Eva which rooms you’re designing…",
    examples: [
      "living room",
      "bedroom",
      "kitchen",
      "home office",
      "dining room",
      "open plan living",
      "kids room",
      "balcony",
    ],
  },
  {
    key: "budget",
    icon: (
      <svg
        className="wf-pref__i"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Budget Range",
    placeholder: "Share your budget as you chat…",
    examples: [
      "S$1,000",
      "S$3,000",
      "S$5,000",
      "S$10,000+",
      "under S$2,000",
      "around S$8,000",
      "flexible",
    ],
  },
  {
    key: "style",
    icon: (
      <svg
        className="wf-pref__i"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
    title: "Design Style",
    placeholder: "Describe the look you want…",
    examples: [
      "modern",
      "scandinavian",
      "minimal",
      "japandi",
      "warm contemporary",
      "mid century",
      "industrial",
      "coastal",
    ],
  },
  {
    key: "color",
    icon: (
      <svg
        className="wf-pref__i"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
      </svg>
    ),
    title: "Color Preferences",
    placeholder: "Mention colors or palettes you like…",
    examples: [
      "warm tones",
      "neutral",
      "soft greens",
      "cool tones",
      "earth palette",
      "cream and oak",
      "black and white",
      "muted blues",
    ],
  },
  {
    key: "furniture",
    icon: (
      <svg
        className="wf-pref__i"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 17 2 2 4-4" />
        <path d="m3 7 2 2 4-4" />
        <path d="M13 6h8" />
        <path d="M13 12h8" />
        <path d="M13 18h8" />
      </svg>
    ),
    title: "Furniture Needs",
    placeholder: "List pieces you need…",
    examples: [
      "sofa",
      "dining table",
      "lighting",
      "storage",
      "coffee table",
      "bed frame",
      "shelving",
      "rugs",
    ],
  },
];

const SUGGESTIONS = [
  "Mood image",
  "Floorplan",
  "Color palette",
  "Cozy living room",
  "Small bedroom",
  "Minimalist tips",
  "Lighting ideas",
];

const ROOMS: Array<{ key: string; label: string; prompt: string }> = [
  {
    key: "living room",
    label: "Living Room",
    prompt: "Help me plan my living room.",
  },
  {
    key: "home office",
    label: "Home Office",
    prompt: "Help me plan my home office.",
  },
  {
    key: "bedroom",
    label: "Bedroom",
    prompt: "Help me plan my bedroom.",
  },
  {
    key: "open plan",
    label: "Open Plan",
    prompt: "Help me plan an open-plan space.",
  },
];

function focusCopy(room: string): string {
  return `Balance look, layout, and budget for your ${room}.`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const IC = {
  bulb: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  ),
  send: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),
  stop: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
    </svg>
  ),
  swap: (
    <svg
      className="wf-eva__i"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  up: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  ),
  copy: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  clip: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  pin: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  ),
  refine: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="21" x2="14" y1="4" y2="4" />
      <line x1="10" x2="3" y1="4" y2="4" />
      <line x1="21" x2="12" y1="12" y2="12" />
      <line x1="8" x2="3" y1="12" y2="12" />
      <line x1="21" x2="16" y1="20" y2="20" />
      <line x1="12" x2="3" y1="20" y2="20" />
      <line x1="14" x2="14" y1="2" y2="6" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="16" x2="16" y1="18" y2="22" />
    </svg>
  ),
  down: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  ),
  pen: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </svg>
  ),
};

const PLACEHOLDERS = [
  "Ask, create, analyze, or explore…",
  "Describe your space in your own words…",
  "Try “sofa under S$1,500”…",
  "Paste a link or attach a floor plan…",
];

function followupsFor(text: string): string[] {
  const tl = text.toLowerCase();
  if (/sofa/.test(tl)) return ["Compare two sofas", "Rug pairing"];
  if (/light/.test(tl))
    return ["Dim to warm bulbs?", "Mark positions on my plan"];
  if (/budget|\$|spend/.test(tl))
    return ["Filter the shortlist to my budget", "Where to save vs splurge?"];
  if (/rug/.test(tl))
    return ["Show flatweave options", "What size for a 3 seat sofa?"];
  if (/palette|neutral|warm/.test(tl))
    return ["Build a 5 color palette", "Add one bold accent"];
  return ["Tell me more", "What would you pick?"];
}

function autoGrow(ta: HTMLTextAreaElement) {
  const min = 40;
  ta.style.height = "0px";
  ta.style.height = `${Math.min(Math.max(ta.scrollHeight, min), 120)}px`;
}

type ChatPageBootstrap = {
  conversation: ChatConversationDto;
  assistantPersona: AssistantPersonaSummary;
  availablePersonas: AssistantPersonaSummary[];
  confirmedPreferences: Record<PrefKey, string | null>;
  confirmedPreferenceDetails: ConfirmedPreferenceDto[];
  pendingProposals: PreferenceProposalDto[];
  memoryEnabled: boolean;
};

/**
 * Route-owned Chat workspace — studio chat markup, real conversation APIs.
 */
export function ChatPage({ initial }: { initial: ChatPageBootstrap }) {
  const router = useRouter();
  const { chatSec, openSection, exitSection } = useChatWorkspace();
  const mainRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const swapRef = useRef<HTMLButtonElement>(null);
  const evaChipRef = useRef<HTMLButtonElement>(null);
  const stickToBottomRef = useRef(true);
  const toastTimerRef = useRef<number | null>(null);
  const collapseTimersRef = useRef(new Map<string, number>());
  const highlightTimerRef = useRef<number | null>(null);
  /** Reuse the same id when retrying an identical failed send. */
  const sendAttemptRef = useRef<{
    content: string;
    clientMessageId: string;
  } | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  /** Visible after close-before-open (aside hidden on mobile). */
  const modalRestoreFocusRef = evaChipRef;
  const [title, setTitle] = useState(() =>
    displayConversationTitle(
      initial.conversation.title,
      initial.conversation.messages.find((message) => message.role === "user")
        ?.content,
    ),
  );
  const [projectId, setProjectId] = useState(initial.conversation.projectId);
  const [projectName, setProjectName] = useState(
    initial.conversation.projectName,
  );
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [threadRenaming, setThreadRenaming] = useState(false);
  const [threadRenameValue, setThreadRenameValue] = useState("");
  const [threadProjects, setThreadProjects] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const threadHeadRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initial.conversation.messages);
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState<ChatMessageSource>("typed");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [asideOpen, setAsideOpen] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(initial.confirmedPreferences);
  const [prefDetails, setPrefDetails] = useState(
    initial.confirmedPreferenceDetails,
  );
  const [persona, setPersona] = useState(initial.assistantPersona);
  const [personas] = useState(initial.availablePersonas);
  const [proposals, setProposals] = useState(initial.pendingProposals);
  const [memoryEnabled, setMemoryEnabled] = useState(initial.memoryEnabled);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [personaSaving, setPersonaSaving] = useState(false);
  const [proposalBusy, setProposalBusy] = useState(false);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [editor, setEditor] = useState<{
    kind: "proposal" | "confirmed";
    proposalId?: string;
    category: string;
    value: string;
  } | null>(null);
  const [source, setSource] = useState<PreferenceSourceDto | null>(null);
  const [collapsedInline, setCollapsedInline] = useState<Record<string, true>>(
    {},
  );
  const [attachment, setAttachment] = useState<{ name: string } | null>(null);
  const [recents, setRecents] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [pinnedIds, setPinnedIds] = useState<Record<string, true>>({});
  const [refineFor, setRefineFor] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Record<string, true>>({});
  const [entPop, setEntPop] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [selTool, setSelTool] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [phIndex, setPhIndex] = useState(0);
  const [phFading, setPhFading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [brainBusy, setBrainBusy] = useState(false);

  const panelInert = useMemo(() => [mainRef], []);
  const modalInertTargets = useMemo(() => [mainRef, asideRef], []);

  useAccountOverlay({
    open: asideOpen,
    onClose: () => setAsideOpen(false),
    panelRef: asideRef,
    restoreFocusRef: evaChipRef,
    inertTargets: panelInert,
  });

  useEffect(() => {
    setTitle(
      displayConversationTitle(
        initial.conversation.title,
        initial.conversation.messages.find((message) => message.role === "user")
          ?.content,
      ),
    );
    setProjectId(initial.conversation.projectId);
    setProjectName(initial.conversation.projectName);
    setThreadMenuOpen(false);
    setThreadRenaming(false);
    setMessages(initial.conversation.messages);
    setPrefs(initial.confirmedPreferences);
    setPrefDetails(initial.confirmedPreferenceDetails);
    setPersona(initial.assistantPersona);
    setProposals(initial.pendingProposals);
    setMemoryEnabled(initial.memoryEnabled);
    setEditingId(null);
    setEditDraft("");
  }, [initial]);

  useEffect(() => {
    exitSection();
    // Clear in-chat section when the conversation identity changes (including first mount).
  }, [initial.conversation.id, exitSection]);

  useEffect(() => {
    if (chatSec && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [chatSec]);

  useEffect(() => {
    if (!chatSec) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      exitSection();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatSec, exitSection]);

  useEffect(() => {
    if (!threadMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (threadHeadRef.current?.contains(target)) return;
      setThreadMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [threadMenuOpen]);

  async function openThreadMenu() {
    setThreadMenuOpen((open) => !open);
    setThreadRenaming(false);
    try {
      const data = await accountRequest<{
        items: Array<{ id: string; name: string }>;
      }>("/api/account/projects");
      setThreadProjects(data.items);
    } catch {
      setThreadProjects([]);
    }
  }

  async function saveThreadTitle() {
    const next = threadRenameValue.trim();
    if (!next) {
      setThreadRenaming(false);
      return;
    }
    try {
      await accountRequest(
        `/api/account/conversations/${initial.conversation.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title: next }),
        },
      );
      setTitle(next);
      setThreadRenaming(false);
      setThreadMenuOpen(false);
    } catch {
      showToast("Could not rename");
    }
  }

  async function assignThreadProject(
    nextId: string | null,
    nextName: string | null,
  ) {
    try {
      await accountRequest(
        `/api/account/conversations/${initial.conversation.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ projectId: nextId }),
        },
      );
      setProjectId(nextId);
      setProjectName(nextName);
      setThreadMenuOpen(false);
    } catch {
      showToast("Could not update project");
    }
  }

  useEffect(() => {
    const ta = composerRef.current;
    if (ta) autoGrow(ta);
  }, [draft]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const ta = composerRef.current;
      if (!ta || document.activeElement === ta || ta.value.trim()) return;
      setPhFading(true);
      window.setTimeout(() => {
        setPhIndex((i) => (i + 1) % PLACEHOLDERS.length);
        setPhFading(false);
      }, 280);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      for (const timer of collapseTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      collapseTimersRef.current.clear();
    };
  }, []);

  // Playwright-only: collapse inline cards without waiting the 60s timer.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.webdriver) return;
    const onCollapse = () => {
      setCollapsedInline((prev) => {
        const next = { ...prev };
        for (const proposal of proposals) {
          if (proposal.status === "pending") next[proposal.id] = true;
        }
        return next;
      });
      for (const timer of collapseTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      collapseTimersRef.current.clear();
    };
    window.addEventListener("furnishes:collapse-inline-proposals", onCollapse);
    return () => {
      window.removeEventListener(
        "furnishes:collapse-inline-proposals",
        onCollapse,
      );
    };
  }, [proposals]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !stickToBottomRef.current) {
      if (!stickToBottomRef.current) setShowJump(true);
      return;
    }
    el.scrollTop = el.scrollHeight;
    setShowJump(false);
  }, [messages, proposals]);

  useEffect(() => {
    const foot = footRef.current;
    const main = mainRef.current;
    if (!foot || !main) return;
    const apply = () =>
      main.style.setProperty("--foot-h", `${foot.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(foot);
    return () => ro.disconnect();
  }, [attachment, sendError, messages.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await accountRequest<{
          items: Array<{ id: string; title: string }>;
        }>("/api/account/conversations");
        if (!cancelled) {
          setRecents(
            data.items.map((item) => ({ id: item.id, title: item.title })),
          );
        }
      } catch {
        if (!cancelled) setRecents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial.conversation.id]);

  useEffect(() => {
    const onAnimEnd = (event: AnimationEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (event.animationName === "wfmsg" || event.animationName === "wffade") {
        const row = target.closest("[data-message-id]");
        if (row instanceof HTMLElement) {
          const id = row.getAttribute("data-message-id");
          if (id) {
            setFreshIds((prev) => {
              if (!prev[id]) return prev;
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
        }
      }
    };
    document.addEventListener("animationend", onAnimEnd, true);
    return () => document.removeEventListener("animationend", onAnimEnd, true);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-entpop]") && !target.closest("[data-ent]")) {
        setEntPop(null);
      }
      if (!target.closest("[data-seltool]")) {
        /* keep until next selection */
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function onBodyScroll() {
    const el = bodyRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    stickToBottomRef.current = nearBottom;
    setShowJump(!nearBottom);
  }

  function jumpToLatest() {
    const el = bodyRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    el.scrollTop = el.scrollHeight;
    setShowJump(false);
  }

  function showToast(text: string) {
    setToast(text);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800);
  }

  function openPersonaPicker() {
    setAsideOpen(false);
    window.requestAnimationFrame(() => {
      setPickerOpen(true);
    });
  }

  function openConfirmedPreferenceEditor(category: PrefKey, value = "") {
    setAsideOpen(false);
    window.requestAnimationFrame(() => {
      setEditor({
        kind: "confirmed",
        category,
        value,
      });
    });
  }

  function openAddPreferenceEditor(category: PrefKey) {
    const existing = splitPreferenceValues(prefs[category]);
    openConfirmedPreferenceEditor(category, joinPreferenceValues(existing));
  }

  function sourceProposalIdFor(category: PrefKey): string | null {
    return (
      prefDetails.find((item) => item.category === category)
        ?.sourceProposalId ?? null
    );
  }

  async function sendContent(
    content: string,
    messageSource: ChatMessageSource = "typed",
  ) {
    let trimmed = content.trim();
    if (attachment) {
      trimmed =
        `${trimmed}${trimmed ? " " : ""}[attached: ${attachment.name}]`.trim();
      setAttachment(null);
    }
    if (!trimmed || sending) return;
    const submittedContent = trimmed;
    const clientMessageId =
      sendAttemptRef.current?.content === trimmed
        ? sendAttemptRef.current.clientMessageId
        : crypto.randomUUID();
    sendAttemptRef.current = { content: trimmed, clientMessageId };
    const abort = new AbortController();
    streamAbortRef.current = abort;
    setSending(true);
    setSendError(null);
    setDraft("");
    setDraftSource("typed");
    setRefineFor(null);
    setEntPop(null);
    setSelTool(null);
    setEditingId(null);
    setEditDraft("");
    if (composerRef.current) {
      composerRef.current.style.height = "auto";
    }

    const tempUserId = `temp-user-${clientMessageId}`;
    const tempAssistantId = `temp-asst-${clientMessageId}`;
    setFreshIds((prev) => ({
      ...prev,
      [tempUserId]: true,
      [tempAssistantId]: true,
    }));
    setMessages((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: "user",
        content: trimmed,
        status: "complete",
        errorCode: null,
        assistantId: null,
        createdAt: new Date().toISOString(),
        feedback: null,
      },
      {
        id: tempAssistantId,
        role: "assistant",
        content: "",
        status: "pending",
        errorCode: null,
        assistantId: null,
        createdAt: new Date().toISOString(),
        feedback: null,
      },
    ]);

    try {
      const response = await fetch(
        `/api/account/conversations/${initial.conversation.id}/messages`,
        {
          method: "POST",
          signal: abort.signal,
          headers: {
            accept: "text/event-stream",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            content: trimmed,
            messageSource,
            clientMessageId,
            stream: true,
          }),
        },
      );

      if (!response.ok || !response.body) {
        let message = "Eva could not reply. Please try again.";
        try {
          const payload = (await response.json()) as {
            message?: string;
            error?: string;
          };
          if (payload.message) message = payload.message;
          throw {
            code: payload.error ?? "request_failed",
            message,
          };
        } catch (error) {
          if (
            typeof error === "object" &&
            error &&
            "code" in error &&
            "message" in error
          ) {
            throw error;
          }
          throw { code: "request_failed", message };
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame
            .split("\n")
            .map((part) => part.trim())
            .find((part) => part.startsWith("data:"));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (!raw) continue;
          let event: {
            type: string;
            text?: string;
            message?: unknown;
            userMessage?: {
              id: string;
              content: string;
              status: string;
              createdAt: string;
            };
            assistantMessage?: {
              id: string;
              content: string;
              status: string;
              assistantId: string | null;
              createdAt: string;
            };
            assistantPersona?: AssistantPersonaSummary;
            preferenceProposals?: PreferenceProposalDto[];
            error?: string;
          };
          try {
            event = JSON.parse(raw) as typeof event;
          } catch {
            continue;
          }

          if (
            event.type === "user" &&
            event.message &&
            typeof event.message === "object"
          ) {
            const userMsg = event.message as {
              id: string;
              content: string;
              status: string;
              createdAt: string;
            };
            setMessages((prev) =>
              prev.map((row) =>
                row.id === tempUserId
                  ? {
                      ...row,
                      id: userMsg.id,
                      content: userMsg.content,
                      status: userMsg.status,
                      createdAt: userMsg.createdAt,
                    }
                  : row,
              ),
            );
          } else if (event.type === "delta" && event.text) {
            const delta = event.text;
            setMessages((prev) =>
              prev.map((row) =>
                row.id === tempAssistantId ||
                (row.role === "assistant" && row.status === "pending")
                  ? { ...row, content: `${row.content}${delta}` }
                  : row,
              ),
            );
          } else if (event.type === "done" && event.assistantMessage) {
            sawDone = true;
            sendAttemptRef.current = null;
            const assistant = event.assistantMessage;
            const userMessage = event.userMessage;
            setMessages((prev) =>
              prev.map((row) => {
                if (userMessage && row.id === tempUserId) {
                  return {
                    ...row,
                    id: userMessage.id,
                    content: userMessage.content,
                    status: userMessage.status,
                    createdAt: userMessage.createdAt,
                  };
                }
                if (
                  row.id === tempAssistantId ||
                  (row.role === "assistant" && row.status === "pending")
                ) {
                  return {
                    ...row,
                    id: assistant.id,
                    content: assistant.content,
                    status: assistant.status,
                    assistantId: assistant.assistantId ?? null,
                    createdAt: assistant.createdAt,
                  };
                }
                return row;
              }),
            );
            if (event.assistantPersona) setPersona(event.assistantPersona);
            const proposals = event.preferenceProposals ?? [];
            if (proposals.length > 0) {
              setProposals((prev) => [...proposals, ...prev]);
              for (const proposal of proposals) {
                const existing = collapseTimersRef.current.get(proposal.id);
                if (existing) window.clearTimeout(existing);
                const timer = window.setTimeout(() => {
                  setCollapsedInline((prev) => ({
                    ...prev,
                    [proposal.id]: true,
                  }));
                  collapseTimersRef.current.delete(proposal.id);
                }, 60_000);
                collapseTimersRef.current.set(proposal.id, timer);
              }
            }
            if (needsGeneratedTitle(title, trimmed)) {
              setTitle(summarizeConversationTitle(trimmed));
            }
            router.refresh();
          } else if (event.type === "stopped" && event.assistantMessage) {
            sawDone = true;
            sendAttemptRef.current = null;
            const assistant = event.assistantMessage;
            setMessages((prev) =>
              prev.map((row) =>
                row.id === tempAssistantId ||
                (row.role === "assistant" && row.status === "pending")
                  ? {
                      ...row,
                      id: assistant.id,
                      content: assistant.content,
                      status: "stopped",
                      assistantId: assistant.assistantId ?? null,
                      createdAt: assistant.createdAt,
                    }
                  : row,
              ),
            );
            if (needsGeneratedTitle(title, trimmed)) {
              setTitle(summarizeConversationTitle(trimmed));
            }
          } else if (event.type === "error") {
            throw {
              code: event.error ?? "request_failed",
              message:
                (typeof event.message === "string" && event.message) ||
                "Eva could not reply. Please try again.",
            };
          }
        }
      }

      if (!sawDone && !abort.signal.aborted) {
        throw {
          code: "request_failed",
          message: "Eva could not finish the reply. Please try again.",
        };
      }
    } catch (error) {
      if (abort.signal.aborted) {
        try {
          const latest = await accountRequest<{
            messages: typeof messages;
          }>(`/api/account/conversations/${initial.conversation.id}`);
          setMessages(latest.messages);
        } catch {
          setMessages((prev) =>
            prev.map((row) =>
              row.id === tempAssistantId ||
              (row.role === "assistant" && row.status === "pending")
                ? {
                    ...row,
                    status: "stopped",
                    content:
                      row.content.trim() ||
                      "Generation stopped. Send another message to continue.",
                  }
                : row,
            ),
          );
        }
      } else {
        setMessages((prev) =>
          prev.filter(
            (row) => row.id !== tempUserId && row.id !== tempAssistantId,
          ),
        );
        setDraft(submittedContent);
        setDraftSource(messageSource);
        setSendError(
          getAccountErrorMessage(
            error,
            "Eva could not reply. Please try again.",
          ),
        );
      }
    } finally {
      if (streamAbortRef.current === abort) streamAbortRef.current = null;
      setSending(false);
    }
  }

  function handleStop() {
    streamAbortRef.current?.abort();
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    void sendContent(draft, draftSource);
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendContent(draft, draftSource);
    }
  }

  function startEdit(messageId: string, content: string) {
    if (sending) return;
    setEditingId(messageId);
    setEditDraft(content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function editResend(messageId: string, nextValue: string) {
    if (sending) return;
    const trimmed = nextValue.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    const index = messages.findIndex((row) => row.id === messageId);
    if (index < 0) {
      cancelEdit();
      return;
    }
    setMessages((prev) => prev.slice(0, index));
    setEditingId(null);
    setEditDraft("");
    void sendContent(trimmed, "typed");
  }

  async function rateMessage(messageId: string, rating: "up" | "down") {
    const previous =
      messages.find((message) => message.id === messageId)?.feedback ?? null;
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, feedback: rating } : message,
      ),
    );
    try {
      await accountRequest(
        `/api/account/conversations/${initial.conversation.id}/messages/${messageId}/feedback`,
        { method: "POST", body: JSON.stringify({ rating }) },
      );
      showToast(rating === "up" ? "Thanks ✓" : "Noted ✓");
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, feedback: previous }
            : message,
        ),
      );
      showToast("Could not save feedback");
    }
  }

  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Copied");
    } catch {
      showToast("Could not copy");
    }
  }

  async function selectPersona(assistantId: string) {
    if (assistantId === persona.id) {
      setPickerOpen(false);
      restorePersonaTriggerFocus();
      return;
    }
    const previous = persona;
    const next = personas.find((item) => item.id === assistantId);
    if (!next) return;
    setPersona(next);
    setPersonaSaving(true);
    try {
      const result = await accountRequest<{
        activePersona: AssistantPersonaSummary;
      }>("/api/account/assistant-persona", {
        method: "PATCH",
        body: JSON.stringify({ assistantId }),
      });
      setPersona(result.activePersona);
      setPickerOpen(false);
      showToast(`Switched to ${result.activePersona.name}`);
      router.refresh();
    } catch {
      setPersona(previous);
      showToast("Could not switch persona");
    } finally {
      setPersonaSaving(false);
      restorePersonaTriggerFocus();
    }
  }

  function restorePersonaTriggerFocus() {
    const swap = swapRef.current;
    if (swap && swap.getClientRects().length > 0) {
      swap.focus();
      return;
    }
    evaChipRef.current?.focus();
  }

  async function setPref(category: PrefKey, value: string): Promise<boolean> {
    if (!memoryEnabled) {
      showToast("Memory is disabled");
      return false;
    }
    setPreferenceSaving(true);
    try {
      const saved = await accountRequest<ConfirmedPreferenceDto>(
        `/api/account/preferences/${category}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            value,
            sourceConversationId: initial.conversation.id,
          }),
        },
      );
      setPrefs((prev) => ({ ...prev, [category]: saved.value }));
      setPrefDetails((prev) => {
        const without = prev.filter((item) => item.category !== category);
        return [saved, ...without];
      });
      showToast("Preference saved ✓");
      router.refresh();
      return true;
    } catch {
      showToast("Could not save preference");
      return false;
    } finally {
      setPreferenceSaving(false);
    }
  }

  async function removePref(category: PrefKey): Promise<boolean> {
    if (!memoryEnabled) {
      showToast("Memory is disabled");
      return false;
    }
    setPreferenceSaving(true);
    try {
      await accountRequest(`/api/account/preferences/${category}`, {
        method: "DELETE",
      });
      setPrefs((prev) => ({ ...prev, [category]: null }));
      setPrefDetails((prev) =>
        prev.filter((item) => item.category !== category),
      );
      showToast("Preference removed");
      router.refresh();
      return true;
    } catch {
      showToast("Could not remove preference");
      return false;
    } finally {
      setPreferenceSaving(false);
    }
  }

  async function removePrefValue(
    category: PrefKey,
    value: string,
  ): Promise<boolean> {
    const remaining = splitPreferenceValues(prefs[category]).filter(
      (item) => item.toLowerCase() !== value.toLowerCase(),
    );
    if (remaining.length === 0) return removePref(category);
    return setPref(category, joinPreferenceValues(remaining));
  }

  async function acceptProposal(proposalId: string, value?: string) {
    setProposalBusy(true);
    try {
      const result = await accountRequest<{
        proposal: PreferenceProposalDto;
        preference: ConfirmedPreferenceDto;
      }>(`/api/account/preference-proposals/${proposalId}/accept`, {
        method: "POST",
        body: JSON.stringify(value ? { value } : {}),
      });
      setProposals((prev) => prev.filter((item) => item.id !== proposalId));
      setPrefs((prev) => ({
        ...prev,
        [result.preference.category]: result.preference.value,
      }));
      setPrefDetails((prev) => {
        const without = prev.filter(
          (item) => item.category !== result.preference.category,
        );
        return [result.preference, ...without];
      });
      setEditor(null);
      router.refresh();
      restorePersonaTriggerFocus();
    } catch {
      showToast("Could not accept suggestion");
    } finally {
      setProposalBusy(false);
    }
  }

  async function rejectProposal(proposalId: string) {
    setProposalBusy(true);
    try {
      await accountRequest(
        `/api/account/preference-proposals/${proposalId}/reject`,
        { method: "POST" },
      );
      setProposals((prev) => prev.filter((item) => item.id !== proposalId));
      showToast("Suggestion dismissed");
      router.refresh();
      restorePersonaTriggerFocus();
    } catch {
      showToast("Could not dismiss suggestion");
    } finally {
      setProposalBusy(false);
    }
  }

  async function viewSource(proposalId: string) {
    try {
      const result = await accountRequest<PreferenceSourceDto>(
        `/api/account/preference-proposals/${proposalId}/source`,
      );
      setSource(result);
    } catch {
      showToast("Source unavailable");
    }
  }

  function goToMessage(messageId: string) {
    setSource(null);
    const node = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!(node instanceof HTMLElement)) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.add("wf-cmsg--flash");
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      node.classList.remove("wf-cmsg--flash");
      highlightTimerRef.current = null;
    }, 1600);
  }

  const pending = proposals.filter((item) => item.status === "pending");
  // Quiz handoff proposals are created before any message exists, so they have
  // no bubble to anchor to. The approved design appends the banner to the end of
  // the thread, which also covers a brand-new conversation.
  const unanchoredProposals = pending.filter(
    (item) => !item.displayMessageId && !collapsedInline[item.id],
  );

  function renderProposalCard(proposal: PreferenceProposalDto) {
    return (
      <PreferenceProposalCard
        key={proposal.id}
        proposal={proposal}
        busy={proposalBusy}
        onAccept={() => void acceptProposal(proposal.id)}
        onEdit={() =>
          setEditor({
            kind: "proposal",
            proposalId: proposal.id,
            category: proposal.category,
            value: proposal.proposedValue,
          })
        }
        onDismiss={() => void rejectProposal(proposal.id)}
        onViewSource={() => void viewSource(proposal.id)}
      />
    );
  }

  return (
    <div className="wireview wireview--chat">
      <div className={`wf-cx${chatSec ? " seco" : ""}`}>
        <div className="wf-cx__main" ref={mainRef}>
          {messages.length > 0 && !chatSec ? (
            <div className="wf-threadhead" ref={threadHeadRef}>
              {threadRenaming ? (
                <form
                  className="wf-threadhead__rename"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveThreadTitle();
                  }}
                >
                  <input
                    className="wf-input"
                    value={threadRenameValue}
                    onChange={(event) =>
                      setThreadRenameValue(event.target.value)
                    }
                    autoFocus
                    aria-label="Chat name"
                  />
                  <button type="submit">Save</button>
                  <button
                    type="button"
                    onClick={() => setThreadRenaming(false)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="wf-threadhead__crumb"
                  aria-expanded={threadMenuOpen}
                  aria-haspopup="menu"
                  data-testid="chat-thread-crumb"
                  onClick={() => void openThreadMenu()}
                >
                  <span className="wf-threadhead__proj">
                    {projectName?.trim() || "Studio"}
                  </span>
                  <span className="wf-threadhead__sep" aria-hidden="true">
                    /
                  </span>
                  <span className="wf-threadhead__name">{title}</span>
                  <svg
                    className="wf-threadhead__chev"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.5 4.5 6 8l3.5-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              {threadMenuOpen && !threadRenaming ? (
                <div
                  className="cnav-recent__menu wf-threadhead__menu"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setThreadRenameValue(title);
                      setThreadRenaming(true);
                    }}
                  >
                    Rename chat
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={!projectId ? "is-current" : undefined}
                    onClick={() => void assignThreadProject(null, null)}
                  >
                    No project
                  </button>
                  {threadProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      role="menuitem"
                      className={
                        projectId === project.id ? "is-current" : undefined
                      }
                      onClick={() =>
                        void assignThreadProject(project.id, project.name)
                      }
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div
            className="wf-entpop"
            data-entpop
            hidden={!entPop}
            style={entPop ? { top: entPop.top, left: entPop.left } : undefined}
          >
            {entPop ? (
              <>
                <div className="wf-entpop__h">
                  <span className="wf-entpop__w">{entPop.text}</span>
                  <span className="wf-entpop__k">idea</span>
                </div>
                <button
                  type="button"
                  className="wf-entpop__a"
                  onClick={() => {
                    setDraft(`Tell me more about ${entPop.text}`);
                    setDraftSource("typed");
                    setEntPop(null);
                  }}
                >
                  Ask about this
                </button>
                <button
                  type="button"
                  className="wf-entpop__a"
                  onClick={() => {
                    setDraft(`“${entPop.text}” `);
                    setDraftSource("typed");
                    setEntPop(null);
                  }}
                >
                  Quote in reply
                </button>
                <button
                  type="button"
                  className="wf-entpop__a"
                  onClick={() => {
                    void copyMessage(entPop.text);
                    setEntPop(null);
                  }}
                >
                  Copy
                </button>
              </>
            ) : null}
          </div>

          <div
            className="wf-seltool"
            data-seltool
            hidden={!selTool}
            style={
              selTool ? { top: selTool.top, left: selTool.left } : undefined
            }
          >
            {selTool ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(`“${selTool.text}” `);
                    setDraftSource("typed");
                    setSelTool(null);
                  }}
                >
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void sendContent(
                      `Tell me more about “${selTool.text}”`,
                      "typed",
                    );
                    setSelTool(null);
                  }}
                >
                  Ask Eva
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copyMessage(selTool.text);
                    setSelTool(null);
                  }}
                >
                  Copy
                </button>
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="wf-tolatest"
            hidden={!showJump}
            data-tolatest
            onClick={jumpToLatest}
            aria-label="Jump to latest"
          >
            {IC.down}
          </button>

          <div
            className="wf-cx__body"
            ref={bodyRef}
            onScroll={() => {
              onBodyScroll();
              setEntPop(null);
              setSelTool(null);
            }}
            onMouseUp={() => {
              window.setTimeout(() => {
                const sel = window.getSelection();
                if (!sel || sel.isCollapsed) {
                  setSelTool(null);
                  return;
                }
                const text = String(sel.toString()).trim();
                if (!text || text.length < 2) {
                  setSelTool(null);
                  return;
                }
                const anchor = sel.anchorNode?.parentElement;
                const bub = anchor?.closest(".wf-bub");
                if (!bub || !bub.closest(".wf-cmsg")) {
                  setSelTool(null);
                  return;
                }
                const main = mainRef.current;
                if (!main) return;
                const base = main.getBoundingClientRect();
                const range = sel.getRangeAt(0).getBoundingClientRect();
                setEntPop(null);
                setSelTool({
                  text: text.length > 60 ? `${text.slice(0, 57)}…` : text,
                  top: Math.max(46, range.top - base.top - 40),
                  left: Math.max(8, range.left - base.left),
                });
              }, 0);
            }}
          >
            {chatSec ? (
              <ChatSectionView
                key={initial.conversation.id}
                section={chatSec}
                confirmedPreferences={prefs}
                recents={recents}
                messageCount={messages.length}
                currentConversationId={initial.conversation.id}
                onExit={exitSection}
                onOpenSection={openSection}
                onOpenConversation={(id) => {
                  exitSection();
                  router.push(`/account/conversations/${id}`);
                }}
                onAsk={(prompt) => {
                  void sendContent(prompt, "typed");
                }}
                onToast={showToast}
              />
            ) : messages.length === 0 ? (
              <div className="wf-empty">
                <div className="wf-empty__av" aria-hidden="true">
                  <svg
                    className="wf-empty__smile"
                    viewBox="0 0 64 64"
                    fill="none"
                  >
                    <g className="wf-empty__smile-face">
                      <g className="wf-empty__smile-eyes">
                        <circle
                          className="wf-empty__smile-eye wf-empty__smile-eye--l"
                          cx="22"
                          cy="26"
                          r="2.1"
                          fill="currentColor"
                        />
                        <circle
                          className="wf-empty__smile-eye wf-empty__smile-eye--r"
                          cx="42"
                          cy="26"
                          r="2.1"
                          fill="currentColor"
                        />
                      </g>
                      <path
                        className="wf-empty__smile-mouth"
                        d="M20 37c3.4 5.2 7.8 7.8 12 7.8S40.6 42.2 44 37"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        fill="none"
                      >
                        <animate
                          attributeName="d"
                          dur="8s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keyTimes="0;0.18;0.36;0.55;0.74;1"
                          keySplines="0.37 0 0.63 1;0.37 0 0.63 1;0.37 0 0.63 1;0.37 0 0.63 1;0.37 0 0.63 1"
                          values="M20 37c3.4 5.2 7.8 7.8 12 7.8S40.6 42.2 44 37;M18.5 36c3.8 6.4 8.8 9.8 13.5 9.8S41.7 42.4 45.5 36;M19 35.2c4.2 7.2 9.4 11 13 11S40.8 42.4 45 35.2;M21 37.4c3 4.4 6.8 6.4 11 6.4S40 41.8 43 37.4;M18.8 36.4c4 6.8 9 10.4 13.2 10.4S41.2 43.2 45.2 36.4;M20 37c3.4 5.2 7.8 7.8 12 7.8S40.6 42.2 44 37"
                        />
                      </path>
                    </g>
                  </svg>
                </div>
                <h2 className="wf-empty__h">How can I help you today?</h2>
                <p className="wf-empty__p">
                  You’re with {persona.name} · {persona.tagline}. Pick a room,
                  or describe your space.
                </p>
                <div className="wf-rooms">
                  {ROOMS.map((room, index) => (
                    <button
                      key={room.key}
                      type="button"
                      className="wf-room"
                      onClick={() =>
                        void sendContent(room.prompt, "room_starter")
                      }
                    >
                      <span className="wf-room__ix">[0{index + 1}]</span>
                      <span className="wf-room__t">{room.label}</span>
                      <span className="wf-room__d">{focusCopy(room.key)}</span>
                    </button>
                  ))}
                </div>
                <p className="wf-empty__hint">
                  Ask about layout, materials, light, or the feel of a room.
                </p>
              </div>
            ) : (
              <div className="wf-msgs">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  const inline = pending.filter(
                    (proposal) =>
                      proposal.displayMessageId === message.id &&
                      !collapsedInline[proposal.id],
                  );
                  const isFresh = !!freshIds[message.id];
                  const isLatestAssistant =
                    !isUser && messages[messages.length - 1]?.id === message.id;
                  const showFollowups =
                    isLatestAssistant &&
                    message.status === "complete" &&
                    Boolean(message.content) &&
                    inline.length === 0 &&
                    !sending;
                  const isEditing = editingId === message.id;
                  return (
                    <div key={message.id}>
                      <div
                        data-message-id={message.id}
                        className={`${isUser ? "wf-cmsg wf-cmsg--me" : "wf-cmsg"}${isFresh ? " wf-cmsg--in" : ""}`}
                      >
                        <div className="wf-cbody">
                          <div
                            className={`wf-bub${
                              !isUser && message.content ? " wf-bub--md" : ""
                            }${
                              !isUser &&
                              !message.content &&
                              message.status === "pending" &&
                              sending
                                ? " wf-bub--ghost"
                                : ""
                            }${!isUser ? " wf-bub--plain" : ""}`}
                            onClick={(event) => {
                              if (isEditing) return;
                              const mark = (event.target as Element).closest?.(
                                "mark[data-ent]",
                              );
                              if (!(mark instanceof HTMLElement)) return;
                              const sel = window.getSelection();
                              if (sel && !sel.isCollapsed) return;
                              const main = mainRef.current;
                              if (!main) return;
                              const base = main.getBoundingClientRect();
                              const rect = mark.getBoundingClientRect();
                              setSelTool(null);
                              setEntPop({
                                text: mark.textContent ?? "",
                                top: rect.bottom - base.top + 6,
                                left: Math.max(8, rect.left - base.left),
                              });
                            }}
                          >
                            {isUser ? (
                              isEditing ? (
                                <>
                                  <textarea
                                    className="wf-exin"
                                    data-me-in={message.id}
                                    rows={2}
                                    style={{ maxWidth: "100%", width: "24rem" }}
                                    value={editDraft}
                                    onChange={(event) =>
                                      setEditDraft(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" &&
                                        !event.shiftKey
                                      ) {
                                        event.preventDefault();
                                        editResend(message.id, editDraft);
                                      } else if (event.key === "Escape") {
                                        cancelEdit();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <div
                                    className="wf-exact"
                                    style={{ marginTop: 7 }}
                                  >
                                    <button
                                      type="button"
                                      className="wf-exbtn"
                                      data-me-save={message.id}
                                      onClick={() =>
                                        editResend(message.id, editDraft)
                                      }
                                    >
                                      ✓ Save & resend
                                    </button>
                                    <button
                                      type="button"
                                      className="wf-exbtn wf-exbtn--ghost"
                                      data-me-cancel={message.id}
                                      onClick={cancelEdit}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {message.content}
                                  <button
                                    type="button"
                                    className="wf-mact wf-medit2"
                                    data-medit={message.id}
                                    title="Edit & resend"
                                    onClick={() =>
                                      startEdit(message.id, message.content)
                                    }
                                  >
                                    {IC.pen}
                                  </button>
                                </>
                              )
                            ) : message.content ? (
                              renderAssistantContent(message.content)
                            ) : message.status === "pending" ? (
                              sending ? (
                                <span className="wf-think">
                                  <span className="wf-shape" />
                                  <span className="wf-think__t">Thinking…</span>
                                </span>
                              ) : (
                                <>
                                  <span className="wf-tdots">
                                    <span />
                                    <span />
                                    <span />
                                  </span>
                                  <span className="wf-tlabel">Thinking</span>
                                </>
                              )
                            ) : null}
                          </div>
                          {!isUser && message.status === "stopped" ? (
                            <p className="wf-stopnote">
                              <b>Stopped.</b> Your partial reply is kept above,
                              send another message to continue.
                            </p>
                          ) : null}
                          {!isUser && message.status !== "pending" ? (
                            <div className="wf-fbrow">
                              <button
                                type="button"
                                className={`wf-fb${message.feedback === "up" ? " on" : ""}`}
                                title="Good response"
                                onClick={() =>
                                  void rateMessage(message.id, "up")
                                }
                              >
                                {IC.up}
                              </button>
                              <button
                                type="button"
                                className={`wf-fb wf-fb--dn${message.feedback === "down" ? " on" : ""}`}
                                title="Bad response"
                                onClick={() =>
                                  void rateMessage(message.id, "down")
                                }
                              >
                                {IC.up}
                              </button>
                              <button
                                type="button"
                                className="wf-mact"
                                title="Copy"
                                onClick={() =>
                                  void copyMessage(message.content)
                                }
                              >
                                {IC.copy}
                              </button>
                              <button
                                type="button"
                                className={`wf-mact${pinnedIds[message.id] ? " on" : ""}`}
                                title="Pin to project"
                                onClick={() => {
                                  setPinnedIds((prev) => {
                                    const next = { ...prev };
                                    if (next[message.id]) {
                                      delete next[message.id];
                                      showToast("Unpinned");
                                    } else {
                                      next[message.id] = true;
                                      showToast("Pinned to this project");
                                    }
                                    return next;
                                  });
                                }}
                              >
                                {IC.pin}
                              </button>
                              <button
                                type="button"
                                className="wf-mact"
                                aria-disabled={!isLatestAssistant}
                                title={
                                  isLatestAssistant
                                    ? "Refine reply"
                                    : "Only the latest reply can be refined"
                                }
                                onClick={() => {
                                  if (!isLatestAssistant) return;
                                  setRefineFor((cur) =>
                                    cur === message.id ? null : message.id,
                                  );
                                }}
                              >
                                {IC.refine}
                              </button>
                            </div>
                          ) : null}
                          {refineFor === message.id ? (
                            <div className="wf-refine" data-refrow>
                              {(
                                [
                                  ["Shorter", "Make that shorter."],
                                  ["More options", "Give me two more options."],
                                  ["Cheaper", "What’s a cheaper alternative?"],
                                ] as const
                              ).map(([label, prompt]) => (
                                <button
                                  key={label}
                                  type="button"
                                  className="wf-chip2"
                                  onClick={() => {
                                    setRefineFor(null);
                                    void sendContent(prompt, "typed");
                                  }}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {showFollowups ? (
                            <div className="wf-fups wf-in2" data-fups>
                              {followupsFor(message.content).map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  className="wf-chip2"
                                  onClick={() =>
                                    void sendContent(chip, "typed")
                                  }
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          <span className="wf-mtime">
                            {fmtTime(message.createdAt)}
                          </span>
                        </div>
                      </div>
                      {inline.map(renderProposalCard)}
                    </div>
                  );
                })}
              </div>
            )}
            {unanchoredProposals.length > 0 ? (
              <div className="wf-msgs">
                {unanchoredProposals.map(renderProposalCard)}
              </div>
            ) : null}
          </div>

          <div className="wf-chat__foot" ref={footRef}>
            <p className="wf-sugg__h">
              {IC.bulb}
              <span className="terra">Quick suggestions</span>
              <span>for your project:</span>
              <button
                type="button"
                className="wf-evachip"
                ref={evaChipRef}
                onClick={() => setAsideOpen(true)}
              >
                <i>E</i>Eva
              </button>
            </p>
            <div className="wf-chips">
              {SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="wf-chip2"
                  onClick={() => {
                    setDraft(chip);
                    setDraftSource("quick_suggestion");
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="wf-cxerrs" role={sendError ? "alert" : undefined}>
              {sendError}
            </div>
            <div className={`wf-attach${attachment ? " has" : ""}`}>
              {attachment ? (
                <span className="wf-attach__chip">
                  <span>📎 {attachment.name}</span>
                  <button
                    type="button"
                    className="wf-psel__x"
                    title="Remove"
                    onClick={() => setAttachment(null)}
                  >
                    ✕
                  </button>
                </span>
              ) : null}
            </div>
            <form
              className={`wf-composer${sending ? " streaming" : ""}`}
              onSubmit={handleSubmit}
            >
              <input
                ref={fileInputRef}
                type="file"
                data-chat-file
                hidden
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (file.size > 1_500_000) {
                    setSendError(`${file.name} is too large (max 1.5 MB).`);
                    return;
                  }
                  setSendError(null);
                  setAttachment({ name: file.name });
                }}
              />
              <button
                type="button"
                className="wf-composer__clip"
                title="Attach image"
                onClick={() => fileInputRef.current?.click()}
              >
                {IC.clip}
              </button>
              <textarea
                ref={composerRef}
                rows={1}
                placeholder={PLACEHOLDERS[phIndex]}
                data-chat-input
                className={phFading ? "ph-fade" : undefined}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setDraftSource("typed");
                  if (sendError) setSendError(null);
                  autoGrow(event.target);
                }}
                onKeyDown={onComposerKey}
                disabled={sending}
              />
              <button
                type="button"
                className="wf-composer__stop"
                data-chat-stop
                title="Stop generating"
                onClick={handleStop}
              >
                {IC.stop}
              </button>
              <button
                type="submit"
                className={`wf-composer__send${draft.trim() || attachment ? "" : " is-empty"}`}
                data-chat-send
                title="Send"
                disabled={sending || (!draft.trim() && !attachment)}
              >
                {IC.send}
              </button>
            </form>
            <p className="wf-ailabel">
              Eva is an AI assistant and can make mistakes, check important
              details.
            </p>
          </div>
        </div>

        <aside
          ref={asideRef}
          className={`wf-cx__aside${asideOpen ? " open" : ""}`}
        >
          <div className="wf-cx__aside-head">
            <button
              type="button"
              className="wf-aside-back"
              onClick={() => setAsideOpen(false)}
            >
              ← Back
            </button>
            <div className="wf-eva">
              <div className="wf-eva__av">E</div>
              <div className="wf-eva__id">
                <div className="wf-eva__n" data-persona-name>
                  {persona.name}
                </div>
                <div className="wf-eva__tag" data-persona-tag>
                  {persona.tagline}
                </div>
              </div>
              <div className="wf-eva__act">
                <PersonaButton buttonRef={swapRef} onClick={openPersonaPicker}>
                  {IC.swap}
                </PersonaButton>
              </div>
            </div>
            <button
              type="button"
              className={`wf-brainstorm${brainBusy || sending ? " busy" : ""}`}
              onClick={() => {
                if (sending || brainBusy) return;
                setBrainBusy(true);
                showToast("Brainstorming ideas…");
                void sendContent(
                  "Brainstorm a direction for this room with me.",
                  "brainstorm",
                ).finally(() => setBrainBusy(false));
              }}
            >
              {IC.bulb}
              <span>{brainBusy ? "Thinking…" : "Brainstorm for me"}</span>
            </button>
          </div>
          <div className="wf-cx__aside-scroll">
            <p className="wf-pref-lbl">Preferences</p>
            {!memoryEnabled ? (
              <p className="wf-pref-memory-off">
                Eva memory is off, so preferences can’t be saved right now.
              </p>
            ) : null}
            {PREF_META.map((block, index) => (
              <PreferenceBlock
                key={block.key}
                category={block.key}
                icon={block.icon}
                title={block.title}
                placeholder={block.placeholder}
                examples={block.examples}
                index={index}
                value={prefs[block.key]}
                origin={preferenceOriginLabel(
                  prefDetails.find((item) => item.category === block.key)
                    ?.source,
                )}
                disabled={!memoryEnabled}
                canViewSource={Boolean(sourceProposalIdFor(block.key))}
                onAdd={(category) => openAddPreferenceEditor(category)}
                onEdit={(category, values) =>
                  openConfirmedPreferenceEditor(
                    category,
                    joinPreferenceValues(values),
                  )
                }
                onRemoveValue={(category, value) =>
                  void removePrefValue(category, value)
                }
                onViewSource={(category) => {
                  const proposalId = sourceProposalIdFor(category);
                  if (!proposalId) return;
                  setAsideOpen(false);
                  window.requestAnimationFrame(() => {
                    void viewSource(proposalId);
                  });
                }}
              />
            ))}
          </div>
        </aside>
      </div>

      <PersonaPicker
        open={pickerOpen}
        personas={personas}
        activeId={persona.id}
        saving={personaSaving}
        inertTargets={modalInertTargets}
        restoreFocusRef={modalRestoreFocusRef}
        onClose={() => {
          setPickerOpen(false);
          restorePersonaTriggerFocus();
        }}
        onSelect={(id) => void selectPersona(id)}
      />
      <PreferenceEditor
        open={Boolean(editor)}
        title={
          editor?.kind === "confirmed"
            ? "Current preference"
            : `Edit ${editor?.category ?? "preference"}`
        }
        category={editor?.category ?? ""}
        initialValue={editor?.value ?? ""}
        saving={editor?.kind === "confirmed" ? preferenceSaving : proposalBusy}
        inertTargets={modalInertTargets}
        restoreFocusRef={modalRestoreFocusRef}
        onClose={() => {
          setEditor(null);
          restorePersonaTriggerFocus();
        }}
        onSave={(value) => {
          if (!editor) return;
          if (editor.kind === "confirmed") {
            void setPref(editor.category as PrefKey, value).then((saved) => {
              if (saved) {
                setEditor(null);
                restorePersonaTriggerFocus();
              }
            });
            return;
          }
          if (editor.proposalId) {
            const proposalId = editor.proposalId;
            // Close immediately so the composer is actionable while accept runs.
            setEditor(null);
            restorePersonaTriggerFocus();
            void acceptProposal(proposalId, value);
          }
        }}
        {...(editor?.kind === "confirmed"
          ? {
              onRemove: () => {
                void removePref(editor.category as PrefKey).then((removed) => {
                  if (removed) {
                    setEditor(null);
                    restorePersonaTriggerFocus();
                  }
                });
              },
              ...(sourceProposalIdFor(editor.category as PrefKey)
                ? {
                    onViewSource: () => {
                      const proposalId = sourceProposalIdFor(
                        editor.category as PrefKey,
                      );
                      if (!proposalId) return;
                      setEditor(null);
                      window.requestAnimationFrame(() => {
                        void viewSource(proposalId);
                      });
                    },
                  }
                : {}),
            }
          : {})}
      />
      <PreferenceSourceInspector
        open={Boolean(source)}
        source={source}
        canGoToMessage={
          Boolean(source?.sourceMessageId) &&
          source!.sourceConversationId === initial.conversation.id
        }
        inertTargets={modalInertTargets}
        restoreFocusRef={modalRestoreFocusRef}
        onClose={() => {
          setSource(null);
          restorePersonaTriggerFocus();
        }}
        onGoToMessage={() => {
          if (source?.sourceMessageId) goToMessage(source.sourceMessageId);
        }}
      />

      <div
        className={`wf-toast${toast ? " show" : ""}`}
        hidden={!toast}
        role="status"
        aria-live="polite"
      >
        {toast?.includes("✓") ? (
          <svg
            className="wf-toast__check"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
        {toast ? toast.replace(/\s*✓\s*/g, " ").trim() : ""}
      </div>
    </div>
  );
}
