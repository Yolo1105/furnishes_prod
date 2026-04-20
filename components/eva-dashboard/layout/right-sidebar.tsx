"use client";

import { IconButton } from "@/components/eva-dashboard/shared/icon-button";
import { useEvaAssistant } from "@/lib/eva-dashboard/contexts/eva-assistant-context";
import { useCurrentConversation } from "@/lib/eva-dashboard/contexts/current-conversation-context";
import { useAppContext } from "@/lib/eva-dashboard/contexts/app-context";
import { useCurrentPreferences } from "@/lib/eva-dashboard/contexts/current-preferences-context";
import { useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/eva-dashboard/ui/avatar";
import { Input } from "@/components/eva-dashboard/ui/input";
import {
  RefreshCw,
  Lightbulb,
  Home,
  DollarSign,
  Star,
  ListChecks,
  X,
  Loader2,
  Pencil,
  Share2,
} from "lucide-react";
import type { DomainFieldConfig } from "@/lib/eva-dashboard/types";
import { toast } from "sonner";
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  API_ROUTES,
} from "@/lib/eva-dashboard/api";
import {
  CONVERSATION_SHARE_LABEL,
  CONVERSATION_SHARE_UNAVAILABLE_TITLE,
} from "@/lib/eva-dashboard/conversation-actions";
import { useConversationShare } from "@/lib/eva-dashboard/use-conversation-share";
import { SourceModal } from "@/components/eva-dashboard/preferences/source-modal";

function PreferenceCard({
  title,
  description,
  icon: Icon,
  isComplete,
  current,
  options,
  value,
  onChange,
  onSourceClick,
  onEditStart,
  isEditing,
  editValue,
  onEditValueChange,
  onEditSave,
  onEditCancel,
  borderOnTabs,
  useMutedBackground,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
  current: string | null;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  onSourceClick?: () => void;
  onEditStart?: () => void;
  isEditing?: boolean;
  editValue?: string;
  onEditValueChange?: (v: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  borderOnTabs?: boolean;
  useMutedBackground?: boolean;
}) {
  const tabClass = borderOnTabs ? "border border-border" : "";
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-right-2 border-border/50 hover:border-primary/40 rounded border bg-transparent p-2.5 transition-all duration-200",
        isComplete && "border-primary/40",
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        <h4 className="text-foreground text-xs font-semibold">{title}</h4>
      </div>
      <p className="text-muted-foreground mb-2 text-[10px]">{description}</p>
      <div className="flex flex-wrap gap-1.5">
        {value ? (
          isEditing ? (
            <span className="inline-flex items-center gap-1">
              <Input
                value={editValue ?? value}
                onChange={(e) => onEditValueChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onEditSave?.();
                  if (e.key === "Escape") onEditCancel?.();
                }}
                onBlur={() => onEditSave?.()}
                className="h-7 w-28 text-[10px]"
                autoFocus
              />
            </span>
          ) : (
            <span
              className={cn(
                "bg-muted/50 text-primary hover:bg-muted/60 hover:text-primary inline-flex items-center gap-1 rounded-md py-1 pr-1 pl-2 text-[10px] font-bold transition-all duration-200",
                tabClass,
              )}
            >
              <button
                type="button"
                onClick={onSourceClick ?? undefined}
                className="max-w-[100px] cursor-pointer truncate text-left"
                title={onSourceClick ? "View source" : undefined}
              >
                {value.replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
              {onEditStart && (
                <button
                  type="button"
                  onClick={onEditStart}
                  aria-label="Edit"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label="Remove preference"
              >
                <X className="h-3 w-3 shrink-0" />
              </button>
            </span>
          )
        ) : (
          options.map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => onChange(opt)}
              className={cn(
                "bg-muted/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-md px-2 py-1 text-[10px] font-medium transition-all duration-200",
                tabClass,
              )}
            >
              {opt}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const DEFAULT_ROOM_OPTIONS = [
  "living room",
  "bedroom",
  "kitchen",
  "dining room",
  "bathroom",
  "home office",
];
const DEFAULT_BUDGET_OPTIONS = ["$1000", "$5000", "$10000+"];
const DEFAULT_STYLE_OPTIONS = [
  "modern",
  "traditional",
  "minimalist",
  "scandinavian",
  "industrial",
  "bohemian",
];
const DEFAULT_COLOR_OPTIONS = [
  "blue",
  "green",
  "neutral",
  "warm tones",
  "cool tones",
];
const DEFAULT_FURNITURE_OPTIONS = [
  "sofa",
  "bed",
  "dining table",
  "coffee table",
  "lighting",
];

const KEY_TO_FIELD: Record<string, string> = {
  roomType: "roomType",
  designStyle: "style",
  budget: "budget",
  colorPref: "color",
  furnitureNeeds: "furniture",
};

interface RightSidebarProps {
  onSendToChat?: (text: string) => void;
}

function optionsFromField(
  field: DomainFieldConfig | undefined,
  fallback: string[],
): string[] {
  if (!field) return fallback;
  const opts = field.suggestions ?? field.vocabulary ?? [];
  return Array.isArray(opts) && opts.length > 0 ? opts : fallback;
}

export const RightSidebar = memo(function RightSidebar({
  onSendToChat,
}: RightSidebarProps = {}) {
  const { selectedAssistant, setShowAssistantPicker } = useEvaAssistant();
  const { conversationId } = useCurrentConversation();
  const { refreshConversationTitle } = useAppContext();
  const {
    preferences,
    setPreferences,
    sourcesByField: sourceByField,
    refreshPreferences,
  } = useCurrentPreferences();
  const [brainstormLoading, setBrainstormLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [domainFields, setDomainFields] = useState<DomainFieldConfig[]>([]);
  const [sourceModal, setSourceModal] = useState<{
    field: string;
    value: string;
    sourceMessageId: string | null;
  } | null>(null);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const { pending: shareLoading, runShare } =
    useConversationShare(conversationId);

  const roomType = preferences.roomType ?? null;
  const budget = preferences.budget ?? null;
  const designStyle = preferences.style ?? null;
  const colorPref = preferences.color ?? null;
  const furnitureNeeds = preferences.furniture ?? null;

  useEffect(() => {
    apiGet<{ fields?: DomainFieldConfig[] }>(API_ROUTES.config)
      .then((config) => setDomainFields(config.fields ?? []))
      .catch(() => setDomainFields([]));
  }, []);

  const fieldsById = Object.fromEntries(
    (domainFields ?? []).map((f) => [f.id, f]),
  );
  const roomOptions = optionsFromField(
    fieldsById.roomType,
    DEFAULT_ROOM_OPTIONS,
  );
  const budgetOptions = optionsFromField(
    fieldsById.budget,
    DEFAULT_BUDGET_OPTIONS,
  );
  const styleOptions = optionsFromField(
    fieldsById.style,
    DEFAULT_STYLE_OPTIONS,
  );
  const colorOptions = optionsFromField(
    fieldsById.color,
    DEFAULT_COLOR_OPTIONS,
  );
  const furnitureOptions = optionsFromField(
    fieldsById.furniture,
    DEFAULT_FURNITURE_OPTIONS,
  );

  useEffect(() => {
    if (!conversationId) {
      setPrefsLoading(false);
      setPreferences({});
      return;
    }
    setPrefsLoading(true);
    refreshPreferences(conversationId)
      .catch(() => toast.error("Failed to load preferences"))
      .finally(() => setPrefsLoading(false));
  }, [conversationId, setPreferences, refreshPreferences]);

  const handlePreferenceChange = async (key: string, value: string | null) => {
    const field = KEY_TO_FIELD[key];
    const next = { ...preferences };
    if (value) {
      next[field] = value;
      setPreferences(next);
      if (conversationId) {
        try {
          await apiPatch(API_ROUTES.conversationPreferences(conversationId), {
            field,
            value,
          });
          toast.success(`Preference updated: ${field}`);
          await refreshPreferences(conversationId);
        } catch {
          toast.error("Failed to update preference");
        }
      }
    } else {
      delete next[field];
      setPreferences(next);
      if (conversationId) {
        try {
          await apiDelete(API_ROUTES.conversationPreferences(conversationId), {
            field,
          });
          toast.success("Preference removed");
          await refreshPreferences(conversationId);
        } catch {
          toast.error("Failed to update preference");
        }
      }
    }
  };

  return (
    <aside
      className="bg-card border-border flex h-full w-64 shrink-0 flex-col border"
      aria-label="Preferences panel"
    >
      <div className="bg-card border-border flex items-center gap-2.5 border-b px-4 py-4">
        <Avatar className="bg-primary h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {selectedAssistant.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-sm font-semibold">
            {selectedAssistant.name}
          </div>
          <div className="text-muted-foreground truncate text-[10px]">
            {selectedAssistant.tagline}
          </div>
        </div>
        <IconButton
          icon={Share2}
          title={
            conversationId
              ? CONVERSATION_SHARE_LABEL
              : CONVERSATION_SHARE_UNAVAILABLE_TITLE
          }
          disabled={!conversationId || shareLoading}
          onClick={() => {
            if (!conversationId) return;
            void runShare();
          }}
        />
        <IconButton
          icon={RefreshCw}
          title="Change AI assistant"
          onClick={() => setShowAssistantPicker(true)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          {conversationId && prefsLoading && (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          <button
            type="button"
            disabled={!conversationId || brainstormLoading}
            onClick={async () => {
              if (!conversationId || !onSendToChat) return;
              setBrainstormLoading(true);
              try {
                const data = await apiPost<{ summary?: string }>(
                  API_ROUTES.brainstorm,
                  { conversationId, preferences },
                );
                if (data.summary) {
                  onSendToChat(data.summary);
                  toast.info("Brainstorm ideas added to chat");
                  await refreshConversationTitle?.(conversationId);
                }
              } catch {
                toast.error("Brainstorm generation failed");
              } finally {
                setBrainstormLoading(false);
              }
            }}
            className="text-primary bg-muted hover:bg-muted/80 active:bg-muted/30 border-border flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
            {brainstormLoading ? "Thinking…" : "Brainstorm for me"}
          </button>

          <div className="!mt-1.5">
            <p className="text-muted-foreground/60 px-0.5 pt-1 pb-0.5 text-[9px] font-semibold tracking-wider uppercase">
              Preferences
            </p>
            <div className="space-y-3 pt-0.5">
              <PreferenceCard
                title="Room Type"
                description="The type of room you're designing"
                icon={Home}
                isComplete={!!roomType}
                current={roomType}
                options={roomOptions}
                value={roomType}
                onChange={(v) => handlePreferenceChange("roomType", v)}
                onSourceClick={
                  roomType
                    ? () =>
                        setSourceModal({
                          field: "Room Type",
                          value: roomType,
                          sourceMessageId: sourceByField.roomType ?? null,
                        })
                    : undefined
                }
                onEditStart={
                  roomType
                    ? () => {
                        setEditingFieldKey("roomType");
                        setEditingValue(roomType);
                      }
                    : undefined
                }
                isEditing={editingFieldKey === "roomType"}
                editValue={editingValue}
                onEditValueChange={setEditingValue}
                onEditSave={async () => {
                  if (editingFieldKey === "roomType" && conversationId) {
                    await apiPatch(
                      API_ROUTES.conversationPreferences(conversationId),
                      { field: KEY_TO_FIELD.roomType, value: editingValue },
                    );
                    setPreferences({ ...preferences, roomType: editingValue });
                    await refreshPreferences(conversationId);
                    toast.success("Preference updated");
                    setEditingFieldKey(null);
                  }
                }}
                onEditCancel={() => setEditingFieldKey(null)}
                borderOnTabs
                useMutedBackground
              />
            </div>
          </div>
          <PreferenceCard
            title="Budget Range"
            description="Your budget for the project"
            icon={DollarSign}
            isComplete={!!budget}
            current={budget}
            options={budgetOptions}
            value={budget}
            onChange={(v) => handlePreferenceChange("budget", v)}
            onSourceClick={
              budget
                ? () =>
                    setSourceModal({
                      field: "Budget",
                      value: budget,
                      sourceMessageId: sourceByField.budget ?? null,
                    })
                : undefined
            }
            onEditStart={
              budget
                ? () => {
                    setEditingFieldKey("budget");
                    setEditingValue(budget);
                  }
                : undefined
            }
            isEditing={editingFieldKey === "budget"}
            editValue={editingValue}
            onEditValueChange={setEditingValue}
            onEditSave={async () => {
              if (editingFieldKey === "budget" && conversationId) {
                await apiPatch(
                  API_ROUTES.conversationPreferences(conversationId),
                  { field: KEY_TO_FIELD.budget, value: editingValue },
                );
                setPreferences({ ...preferences, budget: editingValue });
                await refreshPreferences(conversationId);
                toast.success("Preference updated");
                setEditingFieldKey(null);
              }
            }}
            onEditCancel={() => setEditingFieldKey(null)}
            borderOnTabs
          />
          <PreferenceCard
            title="Design Style"
            description="Your preferred design aesthetic"
            icon={Lightbulb}
            isComplete={!!designStyle}
            current={designStyle}
            options={styleOptions}
            value={designStyle}
            onChange={(v) => handlePreferenceChange("designStyle", v)}
            onSourceClick={
              designStyle
                ? () =>
                    setSourceModal({
                      field: "Design Style",
                      value: designStyle,
                      sourceMessageId: sourceByField.style ?? null,
                    })
                : undefined
            }
            onEditStart={
              designStyle
                ? () => {
                    setEditingFieldKey("designStyle");
                    setEditingValue(designStyle);
                  }
                : undefined
            }
            isEditing={editingFieldKey === "designStyle"}
            editValue={editingValue}
            onEditValueChange={setEditingValue}
            onEditSave={async () => {
              if (editingFieldKey === "designStyle" && conversationId) {
                await apiPatch(
                  API_ROUTES.conversationPreferences(conversationId),
                  { field: KEY_TO_FIELD.designStyle, value: editingValue },
                );
                setPreferences({ ...preferences, style: editingValue });
                await refreshPreferences(conversationId);
                toast.success("Preference updated");
                setEditingFieldKey(null);
              }
            }}
            onEditCancel={() => setEditingFieldKey(null)}
            borderOnTabs
          />
          <PreferenceCard
            title="Color Preferences"
            description="Colors you want to incorporate"
            icon={Star}
            isComplete={!!colorPref}
            current={colorPref}
            options={colorOptions}
            value={colorPref}
            onChange={(v) => handlePreferenceChange("colorPref", v)}
            onSourceClick={
              colorPref
                ? () =>
                    setSourceModal({
                      field: "Color",
                      value: colorPref,
                      sourceMessageId: sourceByField.color ?? null,
                    })
                : undefined
            }
            onEditStart={
              colorPref
                ? () => {
                    setEditingFieldKey("colorPref");
                    setEditingValue(colorPref);
                  }
                : undefined
            }
            isEditing={editingFieldKey === "colorPref"}
            editValue={editingValue}
            onEditValueChange={setEditingValue}
            onEditSave={async () => {
              if (editingFieldKey === "colorPref" && conversationId) {
                await apiPatch(
                  API_ROUTES.conversationPreferences(conversationId),
                  { field: KEY_TO_FIELD.colorPref, value: editingValue },
                );
                setPreferences({ ...preferences, color: editingValue });
                await refreshPreferences(conversationId);
                toast.success("Preference updated");
                setEditingFieldKey(null);
              }
            }}
            onEditCancel={() => setEditingFieldKey(null)}
            borderOnTabs
          />
          <PreferenceCard
            title="Furniture Needs"
            description="Furniture items you need"
            icon={ListChecks}
            isComplete={!!furnitureNeeds}
            current={furnitureNeeds}
            options={furnitureOptions}
            value={furnitureNeeds}
            onChange={(v) => handlePreferenceChange("furnitureNeeds", v)}
            onSourceClick={
              furnitureNeeds
                ? () =>
                    setSourceModal({
                      field: "Furniture",
                      value: furnitureNeeds,
                      sourceMessageId: sourceByField.furniture ?? null,
                    })
                : undefined
            }
            onEditStart={
              furnitureNeeds
                ? () => {
                    setEditingFieldKey("furnitureNeeds");
                    setEditingValue(furnitureNeeds);
                  }
                : undefined
            }
            isEditing={editingFieldKey === "furnitureNeeds"}
            editValue={editingValue}
            onEditValueChange={setEditingValue}
            onEditSave={async () => {
              if (editingFieldKey === "furnitureNeeds" && conversationId) {
                await apiPatch(
                  API_ROUTES.conversationPreferences(conversationId),
                  { field: KEY_TO_FIELD.furnitureNeeds, value: editingValue },
                );
                setPreferences({ ...preferences, furniture: editingValue });
                await refreshPreferences(conversationId);
                toast.success("Preference updated");
                setEditingFieldKey(null);
              }
            }}
            onEditCancel={() => setEditingFieldKey(null)}
            borderOnTabs
          />
        </div>
      </div>
      {sourceModal && (
        <SourceModal
          field={sourceModal.field}
          value={sourceModal.value}
          sourceMessageId={sourceModal.sourceMessageId}
          open={!!sourceModal}
          onClose={() => setSourceModal(null)}
        />
      )}
    </aside>
  );
});
