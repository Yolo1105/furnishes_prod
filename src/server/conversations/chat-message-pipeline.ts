import type { ChatProviderResult } from "./chat-provider";
import type { ExtractedPreferenceCandidate } from "@/server/preferences/preference-types";
import { envMs } from "@/server/env";

function chatTimeoutMs(): number {
  return envMs("CHAT_REQUEST_TIMEOUT_MS", 60_000);
}

function extractionTimeoutMs(): number {
  return envMs("PREFERENCE_EXTRACTION_TIMEOUT_MS", 20_000);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label}_timeout`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type ParallelChatExtractionResult = {
  chat: PromiseSettledResult<ChatProviderResult>;
  extraction: PromiseSettledResult<ExtractedPreferenceCandidate[]>;
};

/**
 * Run chat generation and preference extraction independently after the user
 * message is persisted. Separate timeouts; neither holds a DB transaction.
 */
export async function runParallelChatAndExtraction(input: {
  generate: () => Promise<ChatProviderResult>;
  extract: () => Promise<ExtractedPreferenceCandidate[]>;
}): Promise<ParallelChatExtractionResult> {
  const [chat, extraction] = await Promise.allSettled([
    withTimeout(input.generate(), chatTimeoutMs(), "chat"),
    withTimeout(input.extract(), extractionTimeoutMs(), "extraction"),
  ]);
  return { chat, extraction };
}

/**
 * Failure matrix for parallel chat + extraction after the user message is claimed.
 * Proposals persist only when chat succeeds with non-empty content and extraction
 * produced candidates. Chat failure always discards extraction results.
 */
export function shouldPersistPreferenceProposals(input: {
  chatOk: boolean;
  replyContent: string;
  extractionOk: boolean;
  candidateCount: number;
}): boolean {
  if (!input.chatOk) return false;
  if (!input.replyContent.trim()) return false;
  if (!input.extractionOk) return false;
  return input.candidateCount > 0;
}
