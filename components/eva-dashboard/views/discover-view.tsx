"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  ChevronRight,
  Compass,
  ListChecks,
  Hash,
  Check,
  MessageCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SectionLabel } from "@/components/eva-dashboard/shared/section-label";
import { PREFERENCE_STATUS } from "@/lib/eva-dashboard/theme-colors";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useGoToConversationTab } from "@/lib/eva-dashboard/hooks/use-go-to-conversation-tab";
import { cn } from "@/lib/utils";
import { apiGet, API_ROUTES } from "@/lib/eva-dashboard/api";
import { MIN_MESSAGES_FOR_INSIGHTS } from "@/lib/eva-dashboard/insights-config";
import { ProjectChatPicker } from "@/components/eva-dashboard/project/project-chat-picker";
import { ActiveProjectContextBanner } from "@/components/eva-dashboard/project/active-project-context-banner";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useProjectSurfaceConversationId } from "@/lib/eva-dashboard/hooks/use-project-surface-conversation-id";

interface InsightsPayload {
  keyInsights: string[];
  topics: string[];
  recommendations: string[];
  exploreNext: string[];
  messageCount?: number;
  insightsReady?: boolean;
  insightsUnavailable?: boolean;
}

type LoadState = "idle" | "loading" | "error" | "success";

function StatusDot({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const colors: Record<string, string> = {
    confirmed: PREFERENCE_STATUS.confirmed,
    potential: PREFERENCE_STATUS.potential,
    inferred: PREFERENCE_STATUS.inferred,
  };
  const sizes = { sm: "w-2 h-2", md: "w-2.5 h-2.5" };
  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full",
        colors[status] || "bg-border",
        sizes[size],
      )}
    >
      <span className="sr-only">{status}</span>
    </span>
  );
}

function SectionFrame({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="text-primary h-3.5 w-3.5" />
        <SectionLabel>{title}</SectionLabel>
      </div>
      {children}
    </div>
  );
}

interface DiscoverViewProps {
  onSendToChat?: (text: string) => void;
}

export function DiscoverView({ onSendToChat }: DiscoverViewProps) {
  const scopeConversationId = useProjectSurfaceConversationId();
  const activeProjectCtx = useActiveProjectOptional();
  const { onItemClick } = useAppContext();
  const goToChat = useGoToConversationTab();

  const [configFields, setConfigFields] = useState<
    { id: string; label: string }[]
  >([]);

  const [insightsState, setInsightsState] = useState<LoadState>("idle");
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [prefsState, setPrefsState] = useState<LoadState>("idle");
  const [prefs, setPrefs] = useState<
    { field: string; value: string; confidence: number; status: string }[]
  >([]);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [checkedRecommendations, setCheckedRecommendations] = useState<
    Set<string>
  >(new Set());

  const [insightsRetry, setInsightsRetry] = useState(0);
  const [prefsRetry, setPrefsRetry] = useState(0);

  useEffect(() => {
    apiGet<{ fields?: { id: string; label: string }[] }>(API_ROUTES.config)
      .then((config) => setConfigFields(config.fields ?? []))
      .catch(() => setConfigFields([]));
  }, []);

  const loadInsights = useCallback(() => {
    if (!scopeConversationId) return;
    setInsightsState("loading");
    setInsightsError(null);
    apiGet<InsightsPayload>(
      API_ROUTES.conversationInsights(scopeConversationId),
    )
      .then((data) => {
        setInsights(data);
        setInsightsState("success");
      })
      .catch((e: unknown) => {
        setInsightsError(
          e instanceof Error ? e.message : "Could not load insights",
        );
        setInsightsState("error");
      });
  }, [scopeConversationId]);

  const loadPrefs = useCallback(() => {
    if (!scopeConversationId) return;
    setPrefsState("loading");
    setPrefsError(null);
    apiGet<
      { field: string; value: string; confidence: number; status: string }[]
    >(API_ROUTES.conversationPreferences(scopeConversationId))
      .then((list) => {
        setPrefs(Array.isArray(list) ? list : []);
        setPrefsState("success");
      })
      .catch((e: unknown) => {
        setPrefsError(
          e instanceof Error ? e.message : "Could not load preferences",
        );
        setPrefsState("error");
      });
  }, [scopeConversationId]);

  useEffect(() => {
    if (!scopeConversationId) {
      setInsightsState("idle");
      setInsights(null);
      setInsightsError(null);
      setPrefsState("idle");
      setPrefs([]);
      setPrefsError(null);
      return;
    }
    loadInsights();
  }, [scopeConversationId, insightsRetry, loadInsights]);

  useEffect(() => {
    if (!scopeConversationId) return;
    loadPrefs();
  }, [scopeConversationId, prefsRetry, loadPrefs]);

  const getFieldLabel = (fieldId: string) =>
    configFields.find((f) => f.id === fieldId)?.label ?? fieldId;

  const toggleRecommendation = (id: string) => {
    setCheckedRecommendations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const typeStyles: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
    style: {
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    color: {
      color: "text-info-foreground",
      bg: "bg-info",
      border: "border-info-border",
    },
    furniture: {
      color: "text-foreground",
      bg: "bg-muted/40",
      border: "border-border",
    },
    vibe: {
      color: "text-info-foreground",
      bg: "bg-info",
      border: "border-info-border",
    },
  };

  if (!scopeConversationId) {
    const hasProject = Boolean(activeProjectCtx?.activeProjectId);
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-10 text-center">
        <Compass className="text-muted-foreground h-10 w-10" />
        <div>
          <h2 className="text-foreground text-base font-semibold">
            {hasProject
              ? "No chat in this project yet"
              : "No conversation to show"}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            {hasProject
              ? "Discover pulls insights from chats linked to your active project. Start a thread with this project selected, or pick an existing chat below."
              : "With no active project, only unassigned chats appear here. Select a project in the sidebar or open an unassigned thread."}
          </p>
        </div>
        <ProjectChatPicker className="border-border w-full max-w-md rounded-lg border p-4 text-left" />
        <button
          type="button"
          onClick={goToChat}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium"
        >
          Go to chat
        </button>
      </div>
    );
  }

  const insightsShort = Boolean(
    insights &&
    insights.insightsReady === false &&
    (insights.messageCount ?? 0) < MIN_MESSAGES_FOR_INSIGHTS,
  );

  const insightsUnavailable = insights?.insightsUnavailable === true;

  const renderInsightsBlock = () => {
    if (insightsState === "loading") {
      return (
        <div className="border-border bg-card flex items-center justify-center gap-2 rounded-xl border p-8">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          <span className="text-muted-foreground text-sm">
            Loading insights…
          </span>
        </div>
      );
    }
    if (insightsState === "error") {
      return (
        <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
          <AlertCircle className="text-destructive h-8 w-8" />
          <p className="text-foreground text-sm">{insightsError}</p>
          <button
            type="button"
            onClick={() => setInsightsRetry((n) => n + 1)}
            className="border-border bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      );
    }
    if (!insights) return null;

    if (insightsUnavailable) {
      return (
        <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-6">
          <p className="text-muted-foreground text-sm">
            Insights are not available because the AI service is not configured
            for this environment. Your chat still works; only this summary view
            is affected.
          </p>
          <button
            type="button"
            onClick={() => setInsightsRetry((n) => n + 1)}
            className="border-border hover:bg-muted w-fit rounded-lg border px-3 py-1.5 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      );
    }

    if (insightsShort) {
      return (
        <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-6 text-left">
          <p className="text-foreground text-sm">
            Chat a bit more with Eva (at least {MIN_MESSAGES_FOR_INSIGHTS}{" "}
            messages) so we can distill key insights and topics from your
            thread.
          </p>
          <button
            type="button"
            onClick={goToChat}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit rounded-lg px-4 py-2 text-sm font-medium"
          >
            Continue in chat
          </button>
        </div>
      );
    }

    const hasAnySummary =
      (insights.keyInsights?.length ?? 0) > 0 ||
      (insights.topics?.length ?? 0) > 0 ||
      (insights.recommendations?.length ?? 0) > 0 ||
      (insights.exploreNext?.length ?? 0) > 0;

    if (!hasAnySummary) {
      return (
        <div className="border-border bg-card rounded-xl border p-6">
          <p className="text-muted-foreground text-sm">
            No summary lines yet for this conversation. Say more about your
            room, budget, or style in chat, then return here.
          </p>
          <button
            type="button"
            onClick={goToChat}
            className="text-primary mt-3 text-sm font-medium underline-offset-4 hover:underline"
          >
            Back to chat
          </button>
        </div>
      );
    }

    return (
      <div className="border-border bg-card mb-5 flex flex-col gap-5 rounded-xl border p-5">
        <SectionFrame title="Key insights" icon={Compass}>
          {insights.keyInsights?.length ? (
            <ul className="flex flex-col gap-2">
              {insights.keyInsights.map((insight, i) => (
                <li
                  key={i}
                  className="text-foreground flex items-start gap-2 text-sm"
                >
                  <span className="bg-primary mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" />
                  <span className="leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No key insights yet for this thread.
            </p>
          )}
        </SectionFrame>

        <SectionFrame title="Topics" icon={Hash}>
          {insights.topics?.length ? (
            <div className="flex flex-wrap gap-2">
              {insights.topics.map((topic, i) => (
                <span
                  key={i}
                  className="border-primary/20 bg-primary/10 text-primary rounded-full border px-3 py-1 text-xs font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No topics extracted yet.
            </p>
          )}
        </SectionFrame>

        <SectionFrame title="Recommendations" icon={ListChecks}>
          {insights.recommendations?.length ? (
            <ul className="flex flex-col gap-2">
              {insights.recommendations.map((label, i) => {
                const id = `ins-rec-${i}`;
                const checked = checkedRecommendations.has(id);
                return (
                  <div key={id} className="group flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleRecommendation(id)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          checked
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/40 group-hover:border-primary/50",
                        )}
                      >
                        {checked && (
                          <Check className="text-primary-foreground h-2.5 w-2.5" />
                        )}
                      </span>
                      <span className="text-foreground text-sm leading-relaxed">
                        {label}
                      </span>
                    </button>
                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendToChat(label);
                        }}
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 rounded-md p-1"
                        title="Discuss in chat"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              No high-level recommendations yet.
            </p>
          )}
        </SectionFrame>
      </div>
    );
  };

  const renderLearnedSection = () => {
    if (prefsState === "loading") {
      return (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      );
    }
    if (prefsState === "error") {
      return (
        <div className="border-border bg-card flex flex-col items-center gap-2 rounded-xl border p-5 text-center">
          <p className="text-foreground text-sm">{prefsError}</p>
          <button
            type="button"
            onClick={() => setPrefsRetry((n) => n + 1)}
            className="text-primary text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      );
    }
    if (!prefs.length) {
      return (
        <p className="text-muted-foreground text-sm">
          No preferences recorded yet. Tell Eva about your room, style, or
          budget in chat.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {prefs.map((pref) => {
          const prefId = pref.field;
          const tRaw = pref.field
            ? typeStyles[pref.field as keyof typeof typeStyles]
            : undefined;
          const t: { color: string; bg: string; border: string } =
            tRaw ?? typeStyles.style;
          const isExp = expanded === prefId;
          const label = getFieldLabel(pref.field);
          return (
            <div
              key={prefId}
              className={cn(
                "bg-card overflow-hidden rounded-xl border transition-all",
                isExp ? t.border : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(isExp ? null : prefId)}
                className="hover:bg-muted/30 flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-colors"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold",
                    t.bg,
                    t.color,
                  )}
                >
                  {label[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-semibold">
                      {label}
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase",
                        t.bg,
                        t.color,
                      )}
                    >
                      {pref.field}
                    </span>
                    <StatusDot status={pref.status} />
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-[11px]">
                    {Math.round((pref.confidence ?? 0) * 100)}% confidence
                  </div>
                </div>
                <ChevronRight
                  className={cn(
                    "text-muted-foreground h-5 w-5 shrink-0 transition-transform",
                    isExp && "rotate-90",
                  )}
                />
              </button>

              {isExp && onSendToChat && (
                <div className="border-border border-t px-5 py-4">
                  <p className="text-muted-foreground mb-2 text-xs">
                    Explore this preference further in chat.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onSendToChat(
                        `Let's go deeper on ${label}: my current note is "${pref.value}".`,
                      )
                    }
                    className="text-primary text-xs font-medium underline"
                  >
                    Open in chat
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderExploreNext = () => {
    if (insightsState !== "success" || !insights) return null;
    if (insights.insightsUnavailable || insightsShort) return null;

    const list = insights.exploreNext ?? [];
    if (!list.length) {
      return (
        <div className="bg-muted/30 border-border rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">
            No follow-up prompts suggested yet.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-primary/5 border-primary/10 rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="text-primary h-4 w-4" />
          <span className="text-primary text-xs font-semibold">
            What to explore next
          </span>
        </div>
        {list.map((s, i) => (
          <button
            type="button"
            key={i}
            onClick={() => onSendToChat?.(s)}
            className="text-primary mt-2 flex w-full cursor-pointer items-center gap-2 text-left text-xs hover:underline"
          >
            <span className="bg-primary h-1 w-1 shrink-0 rounded-full" />
            {s}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <ActiveProjectContextBanner
        conversationIdForProjectCheck={scopeConversationId}
      />
      {renderInsightsBlock()}

      <div className="border-border mb-5 border-b pb-5">
        <div className="mb-1.5 flex items-center gap-2">
          <Sparkles className="text-primary h-4 w-4" />
          <span className="text-foreground text-base font-semibold">
            What Eva learned about you
          </span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Based on your conversation — expand a row for a quick path back into
          chat.
        </p>
      </div>

      {renderLearnedSection()}

      {insightsState === "success" &&
        insights &&
        !insights.insightsUnavailable &&
        !insightsShort &&
        renderExploreNext()}

      <div className="border-border bg-card mt-8 rounded-xl border p-5">
        <div className="mb-2 flex items-center gap-2">
          <ListChecks className="text-primary h-4 w-4" />
          <span className="text-foreground text-sm font-semibold">
            Product and budget recommendations
          </span>
        </div>
        <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
          Action-oriented picks, budget breakdown, and discuss-in-chat live in
          the Recommendations view — not duplicated here.
        </p>
        <button
          type="button"
          onClick={() => onItemClick("recommendations", "Recommendations")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-xs font-semibold"
        >
          Open Recommendations
        </button>
      </div>
    </div>
  );
}
