export type SupportKind = "HELP" | "FEEDBACK";

export type SupportStatus =
  | "open" // help: waiting on Furnishes
  | "awaiting_user" // help: waiting on user
  | "resolved" // help: closed
  | "received" // feedback: logged
  | "under_review" // feedback: being looked at
  | "shipped" // feedback: done
  | "wont_ship" // feedback: passed on
  | "declined"; // feedback: out of scope

export type SupportCategory =
  // Help
  | "order"
  | "billing"
  | "access"
  | "other"
  // Feedback
  | "bug"
  | "feature"
  | "general";

export type SupportMessage = {
  id: string;
  role: "user" | "staff";
  staffName?: string;
  content: string;
  at: string;
};

export type SupportAttachment = {
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  /** Storage key — null when upload to R2 hasn't been wired yet */
  storageKey: string | null;
  uploadedAt: string;
};

export type SupportThreadMetadata = {
  /** For bug reports — how often does it reproduce? */
  reproductionFrequency?: "always" | "often" | "sometimes" | "once";
  /** Auto-captured at submission time */
  userAgent?: string;
  /** Freeform structured data for future extension */
  [key: string]: unknown;
};

export type SupportThread = {
  id: string;
  number: string; // e.g. "FH-00234"
  kind: SupportKind;
  category: SupportCategory;
  title: string;
  body: string;
  status: SupportStatus;
  messages: SupportMessage[];
  attachments: SupportAttachment[];
  metadata: SupportThreadMetadata;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  linkedConversationId?: string | null;
  linkedProjectId?: string | null;
};
