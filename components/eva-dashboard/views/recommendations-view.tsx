"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  MessageCircle,
  ListChecks,
  Sparkles,
  ImageIcon,
  Heart,
  Signal,
} from "lucide-react";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  API_ROUTES,
} from "@/lib/eva-dashboard/api";
import type {
  ConversationRecommendationsPayload,
  NormalizedRecommendationItem,
} from "@/lib/eva-dashboard/conversation-output-types";
import { useGoToConversationTab } from "@/lib/eva-dashboard/hooks/use-go-to-conversation-tab";
import { formatBudgetBreakdownLine } from "@/lib/eva-dashboard/recommendations-format";
import { cn } from "@/lib/utils";
import { ProjectChatPicker } from "@/components/eva-dashboard/project/project-chat-picker";
import { ActiveProjectContextBanner } from "@/components/eva-dashboard/project/active-project-context-banner";
import { useActiveProjectOptional } from "@/lib/eva-dashboard/contexts/active-project-context";
import { useProjectSurfaceConversationId } from "@/lib/eva-dashboard/hooks/use-project-surface-conversation-id";
import type { ProjectDetailGetResponse } from "@/lib/eva/projects/api-types";
import {
  RECOMMENDATIONS_FIT_SCORE_COPY,
  RECOMMENDATIONS_PROJECT_RANKING_COPY,
} from "@/lib/eva/projects/summary-constants";
import {
  buildShortlistMatchMaps,
  recommendationItemMatchesShortlist,
  shortlistRowIdForRecommendationItem,
} from "@/lib/eva/recommendations/shortlist-match";

interface RecommendationsViewProps {
  onSendToChat?: (text: string) => void;
}

export function RecommendationsView({
  onSendToChat,
}: RecommendationsViewProps) {
  const scopeConversationId = useProjectSurfaceConversationId();
  const activeProjectCtx = useActiveProjectOptional();
  const goToChat = useGoToConversationTab();

  const [state, setState] = useState<"idle" | "loading" | "error" | "success">(
    "idle",
  );
  const [data, setData] = useState<ConversationRecommendationsPayload | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [addingShortlistId, setAddingShortlistId] = useState<string | null>(
    null,
  );
  /** Keys from `buildShortlistMatchMaps`: productId, sourceRecommendationId, title:* (see recommendation-identity-keys). */
  const [projectShortlistProductIds, setProjectShortlistProductIds] = useState<
    Set<string>
  >(() => new Set());
  /** Same keys → persisted shortlist row id (for remove). */
  const [shortlistRowIdByRecKey, setShortlistRowIdByRecKey] = useState<
    Map<string, string>
  >(() => new Map());

  const activeProjectId = activeProjectCtx?.activeProjectId ?? null;

  const shortlistMaps = useMemo(
    () => ({
      productIds: projectShortlistProductIds,
      rowIdByKey: shortlistRowIdByRecKey,
    }),
    [projectShortlistProductIds, shortlistRowIdByRecKey],
  );

  const applyShortlistRowsToSet = useCallback(
    (rows: ProjectDetailGetResponse["shortlistItems"]) => {
      const maps = buildShortlistMatchMaps(rows);
      setProjectShortlistProductIds(maps.productIds);
      setShortlistRowIdByRecKey(maps.rowIdByKey);
    },
    [],
  );

  const refreshProjectShortlistProductIds = useCallback(async () => {
    if (!activeProjectId) {
      setProjectShortlistProductIds(new Set());
      return;
    }
    try {
      const d = await apiGet<ProjectDetailGetResponse>(
        API_ROUTES.project(activeProjectId),
      );
      applyShortlistRowsToSet(d.shortlistItems);
    } catch {
      setProjectShortlistProductIds(new Set());
      setShortlistRowIdByRecKey(new Map());
    }
  }, [activeProjectId, applyShortlistRowsToSet]);

  useEffect(() => {
    void refreshProjectShortlistProductIds();
  }, [refreshProjectShortlistProductIds]);

  const load = useCallback(() => {
    if (!scopeConversationId) return;
    setState("loading");
    setErrorMessage(null);

    const recsPromise = apiGet<ConversationRecommendationsPayload>(
      API_ROUTES.conversationRecommendations(scopeConversationId),
    );
    const projectPromise =
      activeProjectId != null
        ? apiGet<ProjectDetailGetResponse>(API_ROUTES.project(activeProjectId))
        : Promise.resolve(null);

    void Promise.all([recsPromise, projectPromise])
      .then(([payload, projectDetail]) => {
        if (projectDetail?.shortlistItems?.length) {
          applyShortlistRowsToSet(projectDetail.shortlistItems);
        } else if (activeProjectId) {
          applyShortlistRowsToSet([]);
        } else {
          setProjectShortlistProductIds(new Set());
          setShortlistRowIdByRecKey(new Map());
        }

        setData(payload);
        setState("success");
        const ok = (payload.meta?.state ?? "ok") === "ok";
        if (
          ok &&
          activeProjectId &&
          scopeConversationId &&
          payload.items &&
          payload.items.length > 0
        ) {
          void apiPatch(API_ROUTES.project(activeProjectId), {
            recommendationsSnapshot: {
              conversationId: scopeConversationId,
              capturedAt: new Date().toISOString(),
              items: payload.items,
              suggestions: payload.suggestions ?? [],
              budget_breakdown: payload.budget_breakdown ?? {},
            },
          }).catch(() => {
            /* optional cache */
          });
        }
        /* Shortlist maps already applied from projectDetail above; avoid duplicate GET /api/projects/[id]. */
      })
      .catch((e: unknown) => {
        setErrorMessage(
          e instanceof Error ? e.message : "Could not load recommendations",
        );
        setData(null);
        setState("error");
      });
  }, [
    scopeConversationId,
    activeProjectId,
    refreshProjectShortlistProductIds,
    applyShortlistRowsToSet,
  ]);

  useEffect(() => {
    if (!scopeConversationId) {
      setState("idle");
      setData(null);
      setErrorMessage(null);
      return;
    }
    load();
  }, [scopeConversationId, retryKey, load]);

  const addToProjectShortlist = useCallback(
    async (item: NormalizedRecommendationItem) => {
      if (!activeProjectId || !scopeConversationId) return;
      setAddingShortlistId(item.id);
      try {
        await apiPost<{
          ok: boolean;
          merged?: boolean;
          item: { id: string };
        }>(API_ROUTES.projectShortlist(activeProjectId), {
          conversationId: scopeConversationId,
          recommendationItem: {
            id: item.id,
            title: item.title,
            summary: item.summary,
            reasonWhyItFits: item.reasonWhyItFits,
            category: item.category,
            relatedPreferences: item.relatedPreferences,
            estimatedPrice: item.estimatedPrice,
            rank: item.rank,
            imageUrl: item.imageUrl,
            discussionPrompt: item.discussionPrompt,
          },
        });
        await refreshProjectShortlistProductIds();
      } catch {
        /* surface via button area — optional toast hook not wired here */
      } finally {
        setAddingShortlistId(null);
      }
    },
    [activeProjectId, scopeConversationId, refreshProjectShortlistProductIds],
  );

  const removeFromProjectShortlist = useCallback(
    async (item: NormalizedRecommendationItem) => {
      if (!activeProjectId) return;
      const rowId = shortlistRowIdForRecommendationItem(item, shortlistMaps);
      if (!rowId) {
        await refreshProjectShortlistProductIds();
        return;
      }
      setAddingShortlistId(item.id);
      try {
        await apiDelete(
          API_ROUTES.projectShortlistItem(activeProjectId, rowId),
        );
        await refreshProjectShortlistProductIds();
      } catch {
        /* optional toast */
      } finally {
        setAddingShortlistId(null);
      }
    },
    [activeProjectId, shortlistMaps, refreshProjectShortlistProductIds],
  );

  if (!scopeConversationId) {
    const hasProject = Boolean(activeProjectCtx?.activeProjectId);
    return (
      <div className="border-border bg-card flex flex-col items-center justify-center gap-4 rounded-xl border p-10 text-center">
        <ListChecks className="text-muted-foreground h-10 w-10" />
        <div>
          <h2 className="text-foreground text-base font-semibold">
            {hasProject
              ? "No chat in this project yet"
              : "No conversation to show"}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            {hasProject
              ? "Recommendations use your brief from a chat in the active project. Start one with this project selected, or pick a thread below."
              : "With no active project, only unassigned chats apply. Select a project or open an unassigned thread."}
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

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Generating recommendations…
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-foreground max-w-md text-sm">{errorMessage}</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="border-border bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const meta = data.meta?.state ?? "ok";
  const metaMessage = data.meta?.message;

  if (meta !== "ok") {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-foreground mb-1 text-base font-semibold">
            Recommendations
          </h1>
          <p className="text-muted-foreground text-xs">
            Product and budget directions from your brief — discuss any item in
            chat.
          </p>
        </header>
        <div className="border-border bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {metaMessage ??
              "Recommendations are not available for this conversation yet."}
          </p>
          {meta === "insufficient_preferences" && (
            <button
              type="button"
              onClick={goToChat}
              className="text-primary mt-4 text-sm font-medium underline"
            >
              Add preferences in chat
            </button>
          )}
        </div>
      </div>
    );
  }

  const hasItems = (data.items?.length ?? 0) > 0;
  const hasSuggestions = (data.suggestions?.length ?? 0) > 0;
  const hasBudget =
    data.budget_breakdown && Object.keys(data.budget_breakdown).length > 0;
  const projectRankingApplied = data.meta?.projectRankingApplied === true;

  if (!hasItems && !hasSuggestions && !hasBudget) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-foreground mb-1 text-base font-semibold">
            Recommendations
          </h1>
        </header>
        <div className="border-border bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No recommendation rows were returned. Try adding more detail in
            chat, then refresh.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-primary mt-4 text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 overflow-y-auto">
      <ActiveProjectContextBanner
        conversationIdForProjectCheck={scopeConversationId}
      />
      <header>
        <h1 className="text-foreground mb-1 flex items-center gap-2 text-base font-semibold">
          <Sparkles className="text-primary h-4 w-4" />
          Recommendations
        </h1>
        <p className="text-muted-foreground text-xs">
          Action-oriented picks from your preferences. Use{" "}
          <span className="text-foreground font-medium">Discuss in chat</span>{" "}
          to iterate with Eva.
        </p>
      </header>

      {hasItems && projectRankingApplied ? (
        <div className="border-primary/25 bg-primary/5 flex gap-2 rounded-lg border px-3 py-2 text-xs leading-snug">
          <Signal className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-foreground font-medium">
              {RECOMMENDATIONS_PROJECT_RANKING_COPY.bannerTitle}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {RECOMMENDATIONS_PROJECT_RANKING_COPY.bannerBody}
            </p>
          </div>
        </div>
      ) : null}

      {hasItems && (
        <section>
          <h2 className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-wider uppercase">
            Suggested directions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.items!.map((item) => (
              <article
                key={item.id}
                className="border-border bg-card flex flex-col overflow-hidden rounded-xl border"
              >
                <div className="bg-muted relative aspect-[16/10]">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                  {item.rank != null && (
                    <span className="bg-background/90 text-foreground absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold">
                      #{item.rank}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-foreground text-sm font-semibold">
                      {item.title}
                    </h3>
                    {item.estimatedPrice != null && (
                      <span className="text-primary shrink-0 text-xs font-medium">
                        ~${item.estimatedPrice}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    {item.category}
                  </span>
                  {item.summary ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {item.summary}
                    </p>
                  ) : null}
                  <p className="text-foreground text-xs leading-relaxed">
                    {item.reasonWhyItFits}
                  </p>
                  {item.relatedPreferences.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.relatedPreferences.map((p) => (
                        <span
                          key={p}
                          className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[10px]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {(item.fitScore != null ||
                    (item.explanationFactors?.length ?? 0) > 0) && (
                    <div className="border-border mt-1 border-t pt-3">
                      {item.fitScore != null ? (
                        <div className="mb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                              {RECOMMENDATIONS_FIT_SCORE_COPY.eyebrow}
                            </span>
                            <span className="text-foreground text-xs font-semibold tabular-nums">
                              {Math.round(item.fitScore * 100)}%
                            </span>
                          </div>
                          <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                            <div
                              className="bg-primary h-full rounded-full transition-[width]"
                              style={{
                                width: `${Math.round(item.fitScore * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-muted-foreground mt-1.5 text-[10px] leading-snug">
                            {RECOMMENDATIONS_FIT_SCORE_COPY.caption}
                          </p>
                        </div>
                      ) : null}
                      {item.explanationFactors &&
                      item.explanationFactors.length > 0 ? (
                        <ul className="space-y-1.5">
                          {item.explanationFactors.map((factor, fi) => (
                            <li
                              key={fi}
                              className="text-muted-foreground flex gap-2 text-[11px] leading-snug"
                            >
                              <span
                                className="text-primary mt-0.5 shrink-0"
                                aria-hidden
                              >
                                ·
                              </span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      ) : projectRankingApplied && item.fitScore != null ? (
                        <p className="text-muted-foreground text-[11px] leading-snug">
                          {RECOMMENDATIONS_PROJECT_RANKING_COPY.noOverlapHint}
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-auto flex flex-col gap-2">
                    {activeProjectId && scopeConversationId ? (
                      recommendationItemMatchesShortlist(
                        item,
                        shortlistMaps,
                      ) ? (
                        <button
                          type="button"
                          onClick={() => void removeFromProjectShortlist(item)}
                          disabled={addingShortlistId === item.id}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                            "border-border bg-muted text-foreground hover:bg-muted/80",
                          )}
                        >
                          {addingShortlistId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Heart className="h-3.5 w-3.5 fill-current" />
                          )}
                          Remove from shortlist
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void addToProjectShortlist(item)}
                          disabled={addingShortlistId === item.id}
                          className={cn(
                            "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                            "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                          )}
                        >
                          {addingShortlistId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Heart className="h-3.5 w-3.5" />
                          )}
                          Add to project shortlist
                        </button>
                      )
                    ) : null}
                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={() => onSendToChat(item.discussionPrompt)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-colors",
                          "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
                        )}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Discuss in chat
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {hasSuggestions && (
        <section>
          <h2 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
            Follow-up ideas
          </h2>
          <ul className="space-y-2">
            {data.suggestions!.map((s, i) => (
              <li
                key={i}
                className="text-foreground flex items-start gap-2 text-sm"
              >
                <ListChecks className="text-primary mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{s}</span>
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={() => onSendToChat(s)}
                    className="text-primary ml-auto shrink-0 text-xs underline"
                  >
                    Discuss
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasBudget && (
        <section>
          <h2 className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
            Budget breakdown
          </h2>
          <div className="bg-muted/30 border-border rounded-lg border p-4">
            <dl className="space-y-1.5">
              {Object.entries(data.budget_breakdown!).map(([category, val]) => (
                <div key={category} className="flex justify-between text-xs">
                  <dt className="text-foreground font-medium capitalize">
                    {category}
                  </dt>
                  <dd className="text-muted-foreground">
                    {formatBudgetBreakdownLine(val)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}
