"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";
import { ensureOwns } from "@/lib/auth/authorize";
import {
  PreferenceInputSchema,
  PreferencePatchSchema,
} from "@/lib/validation/schemas";
import type { ActionResult } from "./types";

/**
 * Create a new preference. Called from manual-add flows.
 */
export async function createPreferenceAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await requireUser();
    const data = PreferenceInputSchema.parse(input);
    const row = await prisma.userPreference.create({
      data: { ...data, userId },
    });
    revalidatePath("/account/preferences");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    console.error("[createPreferenceAction] failed:", e);
    return { ok: false, error: "FAILED_TO_CREATE" };
  }
}

/**
 * Confirm a "potential" preference → moves it to "confirmed".
 */
export async function confirmPreferenceAction(
  id: string,
): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    await ensureOwns(userId, "userPreference", id);
    await prisma.userPreference.update({
      where: { id },
      data: { status: "confirmed" },
    });
    revalidatePath("/account/preferences");
    return { ok: true };
  } catch (e) {
    console.error("[confirmPreferenceAction] failed:", e);
    return { ok: false, error: "FAILED_TO_CONFIRM" };
  }
}

/**
 * Partial-update a preference (value, confidence, status, field).
 */
export async function updatePreferenceAction(
  id: string,
  patch: unknown,
): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    await ensureOwns(userId, "userPreference", id);
    const data = PreferencePatchSchema.parse(patch);
    await prisma.userPreference.update({ where: { id }, data });
    revalidatePath("/account/preferences");
    return { ok: true };
  } catch (e) {
    console.error("[updatePreferenceAction] failed:", e);
    return { ok: false, error: "FAILED_TO_UPDATE" };
  }
}

/**
 * Forget one preference.
 */
export async function forgetPreferenceAction(
  id: string,
): Promise<ActionResult> {
  try {
    const { userId } = await requireUser();
    await ensureOwns(userId, "userPreference", id);
    await prisma.userPreference.delete({ where: { id } });
    revalidatePath("/account/preferences");
    return { ok: true };
  } catch (e) {
    console.error("[forgetPreferenceAction] failed:", e);
    return { ok: false, error: "FAILED_TO_FORGET" };
  }
}

/**
 * Forget every preference Eva has stored for the current user. Used by the
 * "Forget everything" button on the Preferences page. Logs to activity so the
 * user can see in Activity what they did.
 */
export async function forgetAllPreferencesAction(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const { userId } = await requireUser();
    const result = await prisma.$transaction(async (tx) => {
      const { count } = await tx.userPreference.deleteMany({
        where: { userId },
      });
      await tx.activityEvent.create({
        data: {
          userId,
          category: "preferences",
          label: `Forgot ${count} preference${count === 1 ? "" : "s"}`,
          description: "User cleared all stored preferences.",
        },
      });
      return count;
    });
    revalidatePath("/account/preferences");
    return { ok: true, data: { count: result } };
  } catch (e) {
    console.error("[forgetAllPreferencesAction] failed:", e);
    return { ok: false, error: "FAILED_TO_FORGET_ALL" };
  }
}
