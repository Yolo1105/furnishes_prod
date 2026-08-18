/**
 * Behavioral signals inferred from user messages (type + category only at persist time).
 * Re-derived from legacy `lib/eva/feedback/implicit-signals.ts`.
 */

import { prisma } from "@/server/db";
import { runAfterResponse } from "@/server/ops/after-response";
import { logOps } from "@/server/ops/log";
import type { ChatPreferenceCategory } from "./preference-types";

type DetectedImplicitSignal = {
  type:
    | "restate_preference"
    | "restate_pending_proposal"
    | "preference_removal"
    | "style_change_after_rec";
  category?: ChatPreferenceCategory;
};

export const PREFERENCE_EXPRESSING =
  /\b(want|like|prefer|love|keep|go with|my style is|looking for|into)\b/i;

const REMOVAL_PATTERN =
  /\b(remove|forget|ignore|don't want|dont want|drop|undo)\b/i;

const STYLE_KEYWORDS = [
  "style",
  "look",
  "modern",
  "scandinavian",
  "traditional",
  "minimal",
  "industrial",
  "boho",
  "scandi",
  "mcm",
  "japandi",
  "contemporary",
  "rustic",
];

type PendingProposal = {
  category: ChatPreferenceCategory;
  proposedValue: string;
};

function valueInPreferenceContext(message: string, value: string): boolean {
  const lower = message.toLowerCase();
  const valueLower = value.toLowerCase();
  if (!lower.includes(valueLower)) return false;
  const valueIdx = lower.indexOf(valueLower);
  const before = lower.slice(Math.max(0, valueIdx - 60), valueIdx);
  const after = lower.slice(
    valueIdx + valueLower.length,
    valueIdx + valueLower.length + 40,
  );
  return PREFERENCE_EXPRESSING.test(`${before} ${after}`);
}

function detectRestateConfirmed(
  message: string,
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>,
): DetectedImplicitSignal | null {
  if (!PREFERENCE_EXPRESSING.test(message)) return null;
  for (const category of Object.keys(
    confirmedPreferences,
  ) as ChatPreferenceCategory[]) {
    const value = confirmedPreferences[category];
    if (!value || value.length < 3) continue;
    if (valueInPreferenceContext(message, value)) {
      return { type: "restate_preference", category };
    }
  }
  return null;
}

function detectRestatePending(
  message: string,
  pendingProposals: PendingProposal[],
): DetectedImplicitSignal | null {
  if (!PREFERENCE_EXPRESSING.test(message)) return null;
  for (const proposal of pendingProposals) {
    if (!proposal.proposedValue || proposal.proposedValue.length < 3) continue;
    if (valueInPreferenceContext(message, proposal.proposedValue)) {
      return { type: "restate_pending_proposal", category: proposal.category };
    }
  }
  return null;
}

function detectPreferenceRemoval(
  message: string,
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>,
): DetectedImplicitSignal | null {
  if (!REMOVAL_PATTERN.test(message)) return null;
  const lower = message.toLowerCase();
  for (const category of Object.keys(
    confirmedPreferences,
  ) as ChatPreferenceCategory[]) {
    const value = confirmedPreferences[category];
    if (!value) continue;
    if (lower.includes(value.toLowerCase())) {
      return { type: "preference_removal", category };
    }
  }
  return null;
}

function detectStyleChangeAfterRec(input: {
  message: string;
  recentRecommendationAt?: Date | null;
  messageIndex?: number | null;
}): DetectedImplicitSignal | null {
  const lower = input.message.toLowerCase();
  const hasStyleIntent = STYLE_KEYWORDS.some((keyword) =>
    lower.includes(keyword),
  );
  if (!hasStyleIntent) return null;
  if (!(input.recentRecommendationAt instanceof Date)) return null;
  if (input.messageIndex == null || input.messageIndex < 0) return null;
  if (input.messageIndex > 6) return null;
  return { type: "style_change_after_rec", category: "style" };
}

export function detectImplicitSignals(input: {
  message: string;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
  pendingProposals?: PendingProposal[];
  recentRecommendationAt?: Date | null;
  messageIndex?: number | null;
}): DetectedImplicitSignal[] {
  const signals: DetectedImplicitSignal[] = [];
  const pending = input.pendingProposals ?? [];

  const restateConfirmed = detectRestateConfirmed(
    input.message,
    input.confirmedPreferences,
  );
  if (restateConfirmed) signals.push(restateConfirmed);

  const restatePending = detectRestatePending(input.message, pending);
  if (restatePending) signals.push(restatePending);

  const removal = detectPreferenceRemoval(
    input.message,
    input.confirmedPreferences,
  );
  if (removal) signals.push(removal);

  const styleChange = detectStyleChangeAfterRec({
    message: input.message,
    ...(input.recentRecommendationAt !== undefined
      ? { recentRecommendationAt: input.recentRecommendationAt }
      : {}),
    ...(input.messageIndex !== undefined
      ? { messageIndex: input.messageIndex }
      : {}),
  });
  if (styleChange) signals.push(styleChange);

  return signals;
}

export function isChatImplicitSignalsEnabled(): boolean {
  return process.env.CHAT_IMPLICIT_SIGNALS_ENABLED === "1";
}

export async function persistImplicitSignals(input: {
  userId: string;
  conversationId: string;
  signals: DetectedImplicitSignal[];
}): Promise<void> {
  if (input.signals.length === 0) return;
  await prisma.implicitSignal.createMany({
    data: input.signals.map((signal) => ({
      userId: input.userId,
      conversationId: input.conversationId,
      type: signal.type,
      category: signal.category ?? null,
    })),
  });
  for (const signal of input.signals) {
    logOps("info", "implicit_signal", {
      conversationId: input.conversationId,
      type: signal.type,
      category: signal.category ?? null,
    });
  }
}

/**
 * Detect + persist signals after the user message is claimed.
 * Failures never affect chat; gated by CHAT_IMPLICIT_SIGNALS_ENABLED.
 */
export function scheduleImplicitSignalDetection(input: {
  userId: string;
  conversationId: string;
  message: string;
  confirmedPreferences: Record<ChatPreferenceCategory, string | null>;
}): void {
  if (!isChatImplicitSignalsEnabled()) return;

  runAfterResponse(async () => {
    try {
      const [pendingProposals, latestRec] = await Promise.all([
        prisma.preferenceProposal.findMany({
          where: {
            userId: input.userId,
            conversationId: input.conversationId,
            status: "pending",
          },
          select: { category: true, proposedValue: true },
        }),
        prisma.designRecommendation.findFirst({
          where: { conversationId: input.conversationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);

      let messageIndex: number | null = null;
      if (latestRec) {
        messageIndex = await prisma.message.count({
          where: {
            conversationId: input.conversationId,
            createdAt: { gt: latestRec.createdAt },
          },
        });
      }

      const signals = detectImplicitSignals({
        message: input.message,
        confirmedPreferences: input.confirmedPreferences,
        pendingProposals: pendingProposals.map((row) => ({
          category: row.category as ChatPreferenceCategory,
          proposedValue: row.proposedValue,
        })),
        recentRecommendationAt: latestRec?.createdAt ?? null,
        messageIndex,
      });
      await persistImplicitSignals({
        userId: input.userId,
        conversationId: input.conversationId,
        signals,
      });
    } catch {
      logOps("warn", "implicit_signal_failed", {
        conversationId: input.conversationId,
      });
    }
  });
}
