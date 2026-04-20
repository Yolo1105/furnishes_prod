"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, UnauthorizedError } from "@/auth";
import { prisma } from "@/lib/db/prisma";

const StyleProfileSchema = z.object({
  styleKey: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  tagline: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  palette: z.array(z.string()).min(1).max(8),
  keywords: z.array(z.string()).min(1).max(8),
});

export type StyleSaveResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: string };

export async function saveStyleProfileAction(
  input: z.infer<typeof StyleProfileSchema>,
): Promise<StyleSaveResult> {
  try {
    const { userId } = await requireUser();
    const parsed = StyleProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const record = await prisma.styleProfileRecord.upsert({
      where: { userId },
      create: { userId, takenAt: new Date(), ...parsed.data },
      update: { takenAt: new Date(), ...parsed.data },
    });

    revalidatePath("/account/style");
    return { ok: true, data: { id: record.id } };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Sign in to save your style profile." };
    }
    console.error("[saveStyleProfile]", e);
    return {
      ok: false,
      error: "Could not save your style profile. Try again.",
    };
  }
}
