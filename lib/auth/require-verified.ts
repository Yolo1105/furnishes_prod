import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/auth";

export class EmailNotVerifiedError extends Error {
  constructor() {
    super("Email not verified");
    this.name = "EmailNotVerifiedError";
  }
}

/** Use for support tickets, notification email prefs, checkout, etc. */
export async function requireVerified() {
  const user = await requireUser();
  const full = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { emailVerified: true },
  });
  if (!full?.emailVerified) {
    throw new EmailNotVerifiedError();
  }
  return user;
}
