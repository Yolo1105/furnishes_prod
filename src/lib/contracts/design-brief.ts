/**
 * Design brief V1 — handoff contract from Chat → Design page.
 */

export type DesignBriefV1 = {
  version: 1;
  generatedAt: string;
  userId: string;
  roomPlanId: string | null;
  conversationId: string | null;
  room: { type: string | null; notes: string | null };
  style: { primary: string | null; secondary: string[]; avoid: string[] };
  palette: { colors: string[]; exclusions: string[] };
  budget: {
    capCents: number | null;
    currency: string;
    allocated: Array<{ label: string; cents: number }>;
  };
  items: Array<{
    label: string;
    category: string;
    priority: string;
    status: string;
    specsNote: string | null;
  }>;
  readiness: { score: number; label: string };
  /** 3–5 sentences, Eva-authored. */
  narrative: string;
};
