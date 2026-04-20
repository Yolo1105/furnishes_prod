/**
 * Shared types for the account section.
 *
 * These mirror the shapes you'd expect from real Prisma rows once the
 * backend lands. Swapping `getMock*` functions for real reads later
 * requires no changes to the view layer.
 */

export type StyleKey =
  | "minimal"
  | "maximalist"
  | "organic"
  | "industrial"
  | "artisan";

export type StyleProfile = {
  key: StyleKey;
  name: string;
  tagline: string;
  description: string;
  palette: string[]; // hex
  keywords: string[];
  takenAt?: string; // ISO
};

export type PreferenceGroup =
  | "style"
  | "room"
  | "budget"
  | "materials"
  | "musthaves"
  | "dealbreakers";

export type UserPreference = {
  id: string;
  group: PreferenceGroup;
  field: string;
  value: string;
  confidence: number; // 0–1
  status: "potential" | "confirmed";
  sourceConversationId?: string;
  sourceConversationTitle?: string;
  updatedAt: string;
};

export type RoomBudget = {
  id: string;
  room: string;
  allocationCents: number; // allocation for this room
  percentage: number;
};

export type Budget = {
  currency: string;
  minCents: number;
  maxCents: number;
  rooms: RoomBudget[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  snippet: string;
  messageCount: number;
  inferredPreferenceCount: number;
  status: "active" | "archived" | "shared";
  updatedAt: string;
};

export type DesignPlaybook = {
  id: string;
  title: string;
  summary: string;
  author: "eva" | "user";
  tags: string[];
  coverHue: number; // 0–360 for HSL placeholder
  updatedAt: string;
};

export type ShortlistItem = {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  priceCents: number;
  currency: string;
  projectId: string | null;
  projectName: string | null;
  notes?: string;
  coverHue: number;
  createdAt: string;
};

export type ProjectStatus =
  | "planning"
  | "sourcing"
  | "in_progress"
  | "done"
  | "archived";

export type Project = {
  id: string;
  title: string;
  description: string;
  room: string;
  status: ProjectStatus;
  budgetCents: number;
  currency: string;
  coverHue: number;
  progress: number; // 0–100
  stats: { conversations: number; shortlistItems: number; uploads: number };
  members: { id: string; name: string; initials: string }[];
  isShared: boolean;
  updatedAt: string;
  createdAt: string;
  /** Design workflow stage (see `lib/eva/design-workflow/stages.ts`). */
  workflowStage?: string;
};

export type Upload = {
  id: string;
  filename: string;
  room: string;
  width: number;
  height: number;
  coverHue: number; // placeholder gradient
  analysis: string; // Eva's summary
  linkedConversationId?: string;
  linkedConversationTitle?: string;
  projectId?: string;
  projectName?: string | null;
  uploadedAt: string;
};

export type HomeType = "HDB" | "Condo" | "Landed" | "Rental" | "Other";

export type Measurement = {
  id: string;
  room: string;
  widthCm: number;
  heightCm: number;
  ceilingCm: number;
  doorwayCm: number;
  notes?: string;
};

export type UserProfile = {
  name: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  image: string | null;
  locale: string;
  timeZone: string;
  homeType: HomeType;
  roomCount: number;
  householdSize: number;
  hasPets: boolean;
  hasKids: boolean;
  measurements: Measurement[];
};

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationCategory =
  | "transactional"
  | "marketing"
  | "collections"
  | "eva-digest"
  | "design-tips"
  | "project-activity"
  | "shared-mentions";

export type NotificationPrefs = {
  matrix: Record<
    NotificationCategory,
    Partial<Record<NotificationChannel, boolean>>
  >;
  digestFrequency: "instant" | "daily" | "weekly";
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
};

export type SessionRow = {
  id: string;
  deviceLabel: string;
  browser: string;
  ip: string;
  city: string;
  country: string;
  lastActive: string;
  current: boolean;
};

export type SecurityEvent = {
  id: string;
  kind:
    | "sign-in"
    | "sign-out"
    | "password-change"
    | "2fa-enabled"
    | "2fa-disabled"
    | "new-device";
  ok: boolean;
  description: string;
  city: string;
  country: string;
  at: string;
};

export type Invoice = {
  id: string;
  number: string;
  description: string;
  amountCents: number;
  currency: string;
  status: "paid" | "due" | "refunded";
  issuedAt: string;
  /** Present when a downloadable PDF exists in storage. */
  pdfKey?: string | null;
};

export type ConsentRow = {
  id: string;
  kind: string;
  grantedAt: string;
  source: string;
  active: boolean;
};

export type ActivityCategory =
  | "sign-in"
  | "profile"
  | "preferences"
  | "project"
  | "upload"
  | "conversation"
  | "security"
  | "billing"
  | "shortlist";

export type ActivityEvent = {
  id: string;
  category: ActivityCategory;
  label: string;
  description?: string;
  at: string;
  href?: string;
};

/* ─────────────────────────────────────────────────────────────
 * Detail-route types (/account/<section>/[id])
 * ───────────────────────────────────────────────────────────── */

export type ConversationMessage = {
  id: string;
  role: "user" | "eva";
  content: string;
  at: string;
  /** Optional: preference learned from this message (shown inline) */
  learnedPreferenceLabel?: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
  projectId: string | null;
  projectName: string | null;
  sharedWith: { id: string; name: string; initials: string }[];
  /** Tags auto-extracted from the conversation content */
  tags: string[];
};

/** Server-assembled shape for `/account/conversations/[id]` (split summary + thread). */
export type AccountConversationDetail = {
  summary: ConversationSummary;
  messages: ConversationMessage[];
  projectId: string | null;
  projectName: string | null;
  sharedWith: { id: string; name: string; initials: string }[];
  tags: string[];
};

export type DesignPlaybookSection = {
  id: string;
  heading: string;
  body: string;
  /** Optional palette or image reference per section */
  accent?: string[];
};

export type DesignPlaybookDetail = DesignPlaybook & {
  sections: DesignPlaybookSection[];
  /** Related playbook IDs for "next reads" */
  relatedIds: string[];
  estReadMinutes: number;
};

export type ShortlistItemDetail = ShortlistItem & {
  /** Longer product description */
  description: string;
  materials: string[];
  dimensionsCm: { widthCm: number; depthCm: number; heightCm: number };
  /** Why Eva thinks this suits you (generated explanation) */
  rationale: string;
  /** IDs of other shortlist items in the same project */
  relatedItemIds: string[];
};

export type { StyleArchetype } from "./style-archetypes";
