"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/auth";
import { prisma } from "@/lib/db/prisma";

const ChannelMatrix = z.record(
  z.string(),
  z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
  }),
);

const PrefsSchema = z.object({
  matrix: ChannelMatrix,
  digestFrequency: z.enum(["instant", "daily", "weekly"]),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

export type NotificationSaveResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveNotificationPrefsAction(
  input: z.infer<typeof PrefsSchema>,
): Promise<NotificationSaveResult> {
  try {
    const { userId } = await requireUser();
    const parsed = PrefsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Invalid input" };
    }

    await prisma.notificationPrefs.upsert({
      where: { userId },
      create: {
        userId,
        matrix: parsed.data.matrix as object,
        digestFrequency: parsed.data.digestFrequency,
        quietHoursStart: parsed.data.quietHoursStart,
        quietHoursEnd: parsed.data.quietHoursEnd,
      },
      update: {
        matrix: parsed.data.matrix as object,
        digestFrequency: parsed.data.digestFrequency,
        quietHoursStart: parsed.data.quietHoursStart,
        quietHoursEnd: parsed.data.quietHoursEnd,
      },
    });

    revalidatePath("/account/notifications");
    return { ok: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Sign in to save notification settings." };
    }
    console.error("[saveNotificationPrefs]", e);
    return { ok: false, error: "Could not save. Try again." };
  }
}
