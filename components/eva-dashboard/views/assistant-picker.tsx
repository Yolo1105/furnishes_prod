"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useEvaAssistant } from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { SectionLabel } from "@/components/eva-dashboard/shared/section-label";
import { Avatar, AvatarFallback } from "@/components/eva-dashboard/ui/avatar";
import { cn } from "@/lib/utils";
import {
  assistantSummaryForClient,
  listAssistantFocusFilters,
  listAssistants,
  type AssistantDefinition,
} from "@/lib/eva/assistants/catalog";
import { apiPatch, API_ROUTES } from "@/lib/eva-dashboard/api";
import { toast } from "sonner";

type FocusFilter = AssistantDefinition["focus"] | "";

const FOCUS_TABS: { value: FocusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "general", label: "Balanced" },
  { value: "style", label: "Style" },
  { value: "layout", label: "Layout" },
  { value: "budget", label: "Budget" },
];

export function AssistantPickerView() {
  const { selectedAssistant, setSelectedAssistant, setShowAssistantPicker } =
    useEvaAssistant();
  const { conversationId } = useCurrentConversation();
  const [styleFilter, setStyleFilter] = useState<FocusFilter>("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const assistants = useMemo(() => listAssistants(), []);
  const focusTabs = useMemo(() => listAssistantFocusFilters(), []);

  const filteredAssistants = assistants.filter((a) => {
    if (styleFilter && a.focus !== styleFilter) return false;
    return true;
  });

  const selectAssistant = async (def: AssistantDefinition) => {
    setPendingId(def.id);
    try {
      if (conversationId) {
        await apiPatch(API_ROUTES.conversation(conversationId), {
          assistantId: def.id,
        });
      }
      setSelectedAssistant(assistantSummaryForClient(def));
      setShowAssistantPicker(false);
    } catch {
      toast.error("Could not save assistant for this conversation.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex h-10 shrink-0 items-center justify-between border-b px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-foreground border-primary border-b-2 pb-0.5 text-xs font-medium">
            Choose AI assistant
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAssistantPicker(false)}
          className="text-muted-foreground hover:text-foreground text-xs font-medium"
        >
          Close
        </button>
      </div>
      <main
        role="main"
        className="bg-card animate-in fade-in slide-in-from-bottom-2 flex-1 overflow-y-auto p-6 duration-200"
      >
        <p className="text-muted-foreground mb-4 max-w-2xl text-sm">
          Each assistant uses the same Furnishes safety rules but applies a
          different coaching lens—tone, reply structure, priorities, and
          follow-up style. Your choice is saved per conversation and drives real
          model behavior.
        </p>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <SectionLabel>Focus</SectionLabel>
          {focusTabs.map((opt) => (
            <button
              type="button"
              key={opt.value || "all"}
              onClick={() => setStyleFilter(opt.value as FocusFilter)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                (opt.value === "" && !styleFilter) || styleFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {filteredAssistants.length === 0 ? (
            <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
              No assistants match this filter.
            </p>
          ) : (
            filteredAssistants.map((assistant) => (
              <button
                type="button"
                key={assistant.id}
                disabled={pendingId !== null}
                onClick={() => void selectAssistant(assistant)}
                className={cn(
                  "bg-card flex cursor-pointer flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all duration-200",
                  selectedAssistant?.id === assistant.id
                    ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                    : "border-border hover:border-primary/50 hover:bg-primary/5",
                  pendingId !== null && "pointer-events-none opacity-70",
                )}
              >
                <div className="flex w-full items-center gap-3">
                  <Avatar className="bg-primary h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {assistant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {assistant.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {assistant.tagline}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {assistant.description}
                </p>
                <div>
                  <p className="text-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                    Best for
                  </p>
                  <ul className="text-muted-foreground list-inside list-disc text-[11px]">
                    {assistant.idealUseCases.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-foreground mb-1 text-[10px] font-semibold tracking-wide uppercase">
                    Priority rules
                  </p>
                  <ol className="text-muted-foreground list-decimal space-y-0.5 pl-4 text-[11px]">
                    {assistant.priorityRules.slice(0, 3).map((r, idx) => (
                      <li key={`${assistant.id}-rule-${idx}`}>{r}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {assistant.traits.map((trait) => (
                    <span
                      key={trait}
                      className="bg-muted text-foreground/80 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
