"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-staff";
import { appendStaffReply } from "@/lib/site/support/store";
import type { SupportStatus } from "@/lib/site/support/types";
import type { ActionResult } from "./types";

/**
 * Staff actions for the support admin UI.
 *
 * Authentication: requireStaff() — gates all callers to role >= staff.
 * Will redirect to /login or /account on failure (via Next's redirect()).
 *
 * After a staff reply, fires the Inngest event "support/staff.replied"
 * which triggers an email notification to the user (if Inngest + Resend
 * are wired with env vars).
 */

const ReplySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().trim().min(1, "Reply is empty").max(5_000),
  setStatus: z
    .enum([
      "open",
      "awaiting_user",
      "resolved",
      "received",
      "under_review",
      "shipped",
      "wont_ship",
      "declined",
    ])
    .optional(),
});

const CloseSchema = z.object({
  threadId: z.string().min(1),
  resolution: z.enum(["resolved", "wont_ship", "declined", "shipped"]),
});

/**
 * Reply as staff to a user's thread. Updates thread status. Optionally
 * closes the thread by setting setStatus to a terminal status.
 */
export async function replyAsStaffAction(
  input: z.infer<typeof ReplySchema>,
): Promise<ActionResult<{ threadId: string; messageId: string }>> {
  const staff = await requireStaff();

  const parsed = ReplySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const result = await appendStaffReply({
    threadId: parsed.data.threadId,
    staffName: `${staff.name ?? staff.email.split("@")[0]} — Furnishes Support`,
    content: parsed.data.content,
    setStatus: parsed.data.setStatus as SupportStatus | undefined,
  });

  if (!result) {
    return { ok: false, error: "Thread not found." };
  }

  // Fire-and-forget: trigger user email notification via Inngest.
  // Only fires if INNGEST_EVENT_KEY is set; silently no-ops otherwise.
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      const { inngest } = await import("@/lib/jobs/inngest");
      await inngest.send({
        name: "support/staff.replied",
        data: {
          threadId: result.thread.id,
          messageId: result.messageId,
        },
      });
    } catch (e) {
      // Don't fail the reply if Inngest is unreachable — log it
      console.error("[admin/support] inngest send failed:", e);
    }
  }

  revalidatePath(`/admin/support/${result.thread.id}`);
  revalidatePath("/admin/support");
  // Also bust the user-facing thread cache
  revalidatePath(`/account/support/${result.thread.id}`);

  return {
    ok: true,
    data: { threadId: result.thread.id, messageId: result.messageId },
  };
}

/**
 * Close a thread administratively (different from the user's own close).
 */
export async function closeThreadAsStaffAction(
  input: z.infer<typeof CloseSchema>,
): Promise<ActionResult<{ threadId: string }>> {
  await requireStaff();

  const parsed = CloseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  // Use the existing closeThread but pass any user — since requireStaff
  // gated us, we know it's safe. But closeThread is user-scoped, so we
  // use appendStaffReply with empty content + terminal status instead.
  // Actually simpler: just write directly via the staff helper.
  const result = await appendStaffReply({
    threadId: parsed.data.threadId,
    staffName: "Furnishes Support",
    content:
      parsed.data.resolution === "resolved"
        ? "Marking this resolved. Reach out anytime if you need more help."
        : parsed.data.resolution === "shipped"
          ? "Good news — this is shipped! Thanks for the suggestion."
          : parsed.data.resolution === "wont_ship"
            ? "After review, this isn't something we'll be shipping. Thanks for sharing it though."
            : "After review, this is outside what we can help with.",
    setStatus: parsed.data.resolution as SupportStatus,
  });

  if (!result) return { ok: false, error: "Thread not found." };

  revalidatePath(`/admin/support/${parsed.data.threadId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/account/support/${parsed.data.threadId}`);

  return { ok: true, data: { threadId: parsed.data.threadId } };
}
