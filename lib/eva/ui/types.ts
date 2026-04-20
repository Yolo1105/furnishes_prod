export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: string;
  extractions?: Array<{
    text: string;
    field: string;
    confidence: number;
    needsConfirmation?: boolean;
    confirmMessage?: string;
  }>;
}

export interface RecentItem {
  id: string;
  label: string;
}
