import type { ChatGenerationFailureCategory } from "@/lib/eva/core/chat-generation-failure";
import type {
  AttachmentClientReadiness,
  ChatAttachmentPayload,
} from "@/lib/eva/api/chat-attachment";

// Navigation & routing
export type ViewId =
  | "new-chat"
  | "search"
  | "workspace"
  | "files"
  | "discover"
  | "playbook"
  | "cart"
  | "settings"
  | "community"
  | "customize"
  | "landing";

// Domain entities
export interface Assistant {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  /** Catalog focus bucket for filters */
  focus?: "general" | "style" | "layout" | "budget";
  traits?: string[];
}

export interface RecentItem {
  id: string;
  label: string;
  /** Present when the tab is backed by a persisted conversation (`convo-*`). */
  isSaved?: boolean;
  savedAt?: string | null;
  /** Server `projectId` for this conversation, when known. */
  projectId?: string | null;
}

export type ChatErrorType =
  | "cost_limit"
  | "rate_limit"
  | "timeout"
  | "network"
  | "llm_unavailable"
  | "empty_reply"
  | "generic";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  extractions?: {
    text: string;
    field: string;
    confidence: number;
    needsConfirmation?: boolean;
    confirmMessage?: string;
  }[];
  id?: string; // DB message id (for feedback)
  isError?: boolean;
  errorType?: ChatErrorType;
  /** User tapped Stop — partial reply may be present; not a model failure. */
  stoppedByUser?: boolean;
  /** Server-side classification when generation failed (not shown in UI). */
  generationFailureCategory?: ChatGenerationFailureCategory;
  /** `X-Chat-Request-Id` from the last /api/chat response (correlation / retries). */
  chatRequestId?: string;
  /** Client per-send id echoed from `X-Chat-Client-Attempt-Id`. */
  clientAttemptId?: string;
  /** Last-send attachment lifecycle hints (user turns only). */
  attachmentReadiness?: Array<{
    label?: string;
    clientReadiness: AttachmentClientReadiness;
  }>;
  /** Full structured attachments for retries / correlation (user turns only). */
  chatAttachments?: ChatAttachmentPayload[];
}

export interface FileItem {
  id: string;
  title: string;
  desc: string;
  type: string;
  tags: string[];
  time: string;
}

// Domain field config (client-safe; API returns this from /api/config)
export interface DomainFieldConfig {
  id: string;
  label: string;
  type?: string;
  vocabulary?: string[];
  suggestions?: string[];
}

// Preference types (for right sidebar + discover page)
export type PreferenceStatus = "confirmed" | "potential" | "inferred";

export interface Preference {
  id: string;
  label: string;
  type?: string;
  confidence: number;
  status: PreferenceStatus;
  connections: string[];
  suggestions: { text: string; type: string }[];
}
