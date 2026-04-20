"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/auth";
import {
  createSupportThread,
  appendUserReply,
  closeThread,
} from "@/lib/site/support/store";
import { MOCK_USER_ID } from "@/lib/auth/mock-constants";
import { isMockAuthEnabled } from "@/lib/auth/mock-auth";
import type { ActionResult } from "./types";

/**
 * Server actions for the support module.
 *
 * Authentication:
 *   - Prefers a real NextAuth session (exposes user.id via JWT callback)
 *   - Falls back to the mock-auth cookie when isMockAuthEnabled() (see mock-auth.ts)
 *
 * Every action returns { ok: true, ... } on success, { ok: false, error }
 * on validation/auth failure. Throws only on unexpected infrastructure
 * failures so the framework's error boundary catches them.
 */

async function getActingUserId(): Promise<string | null> {
  // 1. Real session — returns the User.id from JWT.sub (set by our
  //    session callback in authOptions)
  try {
    const u = await getUser();
    if (u) return u.userId;
  } catch {
    // getUser throws only on programmer error; fall through
  }

  // 2. Mock cookie — same gate as middleware / account layout
  const mockAllowed = isMockAuthEnabled();
  if (mockAllowed) {
    const cookieStore = await cookies();
    if (cookieStore.get("furnishes-mock-auth")?.value === "1") {
      return MOCK_USER_ID;
    }
  }

  return null;
}

/* ── Schemas ──────────────────────────────────────────────────── */

const HelpCategory = z.enum(["order", "billing", "access", "other"]);
const FeedbackCategory = z.enum(["bug", "feature", "general"]);
const ReproductionFrequency = z.enum(["always", "often", "sometimes", "once"]);

const CreateHelpSchema = z.object({
  category: HelpCategory,
  title: z.string().trim().min(4, "Subject is too short").max(200),
  body: z
    .string()
    .trim()
    .min(10, "Please add more detail — at least 10 characters")
    .max(5_000),
});

const CreateFeedbackSchema = z.object({
  category: FeedbackCategory,
  title: z.string().trim().min(4, "Subject is too short").max(200),
  body: z
    .string()
    .trim()
    .min(10, "Please add more detail — at least 10 characters")
    .max(5_000),
  reproductionFrequency: ReproductionFrequency.optional(),
});

const ReplySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().trim().min(1, "Message is empty").max(5_000),
});

const CloseSchema = z.object({
  threadId: z.string().min(1),
});

/* ── Actions ──────────────────────────────────────────────────── */

/**
 * Create a help ticket. Initial status "open", first message mirrors body.
 */
export async function createHelpThreadAction(
  input: z.infer<typeof CreateHelpSchema>,
): Promise<ActionResult<{ threadId: string; number: string }>> {
  const userId = await getActingUserId();
  if (!userId) return { ok: false, error: "You must be signed in." };

  const parsed = CreateHelpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // Capture user agent for context (non-sensitive)
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? undefined;

  const thread = await createSupportThread(userId, {
    kind: "HELP",
    category: parsed.data.category,
    title: parsed.data.title,
    body: parsed.data.body,
    metadata: userAgent ? { userAgent } : {},
  });

  revalidatePath("/account/support/help");
  revalidatePath("/account/support");

  return { ok: true, data: { threadId: thread.id, number: thread.number } };
}

/**
 * Create a feedback item. Bug reports additionally capture reproduction frequency.
 */
export async function createFeedbackThreadAction(
  input: z.infer<typeof CreateFeedbackSchema>,
): Promise<ActionResult<{ threadId: string; number: string }>> {
  const userId = await getActingUserId();
  if (!userId) return { ok: false, error: "You must be signed in." };

  const parsed = CreateFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? undefined;

  const metadata: Record<string, unknown> = {};
  if (userAgent) metadata.userAgent = userAgent;
  if (parsed.data.reproductionFrequency) {
    metadata.reproductionFrequency = parsed.data.reproductionFrequency;
  }

  const thread = await createSupportThread(userId, {
    kind: "FEEDBACK",
    category: parsed.data.category,
    title: parsed.data.title,
    body: parsed.data.body,
    metadata,
  });

  revalidatePath("/account/support/feedback");
  revalidatePath("/account/support");

  return { ok: true, data: { threadId: thread.id, number: thread.number } };
}

/**
 * Append a user reply to an existing thread. Closed threads cannot be replied to.
 */
export async function replyToThreadAction(
  input: z.infer<typeof ReplySchema>,
): Promise<ActionResult<{ threadId: string }>> {
  const userId = await getActingUserId();
  if (!userId) return { ok: false, error: "You must be signed in." };

  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const thread = await appendUserReply(
    userId,
    parsed.data.threadId,
    parsed.data.content,
  );
  if (!thread) return { ok: false, error: "Thread not found." };

  revalidatePath(`/account/support/${thread.id}`);
  revalidatePath("/account/support");

  return { ok: true, data: { threadId: thread.id } };
}

/**
 * User-initiated close. Withdraw / resolve.
 */
export async function closeThreadAction(
  input: z.infer<typeof CloseSchema>,
): Promise<ActionResult<{ threadId: string }>> {
  const userId = await getActingUserId();
  if (!userId) return { ok: false, error: "You must be signed in." };

  const parsed = CloseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const thread = await closeThread(userId, parsed.data.threadId);
  if (!thread) return { ok: false, error: "Thread not found." };

  revalidatePath(`/account/support/${thread.id}`);
  revalidatePath("/account/support");

  return { ok: true, data: { threadId: thread.id } };
}
