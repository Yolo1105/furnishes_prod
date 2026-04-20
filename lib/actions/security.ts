"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import * as bcrypt from "bcrypt";
import { requireUser, UnauthorizedError } from "@/auth";
import { prisma } from "@/lib/db/prisma";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(128)
    .refine((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p), {
      message: "Include uppercase, lowercase, and a number",
    }),
});

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

async function deleteOtherSessions(userId: string): Promise<number> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value ??
    cookieStore.get("next-auth.session-token")?.value ??
    cookieStore.get("__Secure-next-auth.session-token")?.value;

  const result = await prisma.session.deleteMany({
    where: {
      userId,
      ...(token ? { sessionToken: { not: token } } : {}),
    },
  });
  return result.count;
}

export async function changePasswordAction(
  input: z.infer<typeof ChangePasswordSchema>,
): Promise<ChangePasswordResult> {
  try {
    const { userId } = await requireUser();
    const parsed = ChangePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user?.password) {
      return { ok: false, error: "No password set on this account" };
    }

    const valid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password,
    );
    if (!valid) return { ok: false, error: "Current password is incorrect" };

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: newHash, sessionVersion: { increment: 1 } },
      }),
      prisma.securityEvent.create({
        data: {
          userId,
          kind: "password_change",
          ok: true,
          description: "Password changed via account settings",
        },
      }),
    ]);

    await deleteOtherSessions(userId);

    return { ok: true };
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return { ok: false, error: "Sign in to change your password." };
    }
    console.error("[changePassword]", e);
    return { ok: false, error: "Could not change password. Try again." };
  }
}
