import { z } from "zod";
import { prisma } from "@/server/db";
import { appOrigin } from "@/server/app-origin";
import {
  createRandomToken,
  digestToken,
  hashPassword,
  verifyPassword,
} from "@/server/auth/crypto";
import {
  authForgotMaxAttempts,
  authLoginMaxAttempts,
  authRateLimitWindowMs,
  authResendVerifyMaxAttempts,
  authResetMaxAttempts,
  authSignupMaxAttempts,
  authVerifyMaxAttempts,
  consumeRateLimit,
} from "@/server/auth/rate-limit";
import { recordSecurityEvent } from "@/server/auth/security-events";
import {
  clearSessionCookie,
  createSession,
  revokeAllSessions,
  revokeOtherSessions,
  revokeSession,
  setSessionCookie,
} from "@/server/auth/session";
import { sendEmail } from "@/server/email/send";
import { err, ok, type ServiceResult } from "@/server/result";
import { routes } from "@/lib/contracts/routes";

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(200);

const GENERIC_AUTH_ERROR = "Invalid email or password.";
const GENERIC_RECOVERY =
  "If an account exists for that email, recovery instructions have been sent.";
const GENERIC_VERIFY =
  "If an account needs verification, a message has been sent.";

function ipKey(prefix: string, ipAddress?: string | null): string {
  return `${prefix}:ip:${ipAddress?.trim() || "unknown"}`;
}

function accountKey(prefix: string, email: string): string {
  return `${prefix}:acct:${email.toLowerCase()}`;
}

async function maybeSendLoginAlert(input: {
  userId: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const prefs = await prisma.notificationPrefs.findUnique({
    where: { userId: input.userId },
  });
  if (!prefs?.emailSecurity) return;

  const where = input.ipAddress?.trim() || "an unknown network";
  const agent = input.userAgent?.trim() || "an unknown browser";
  await sendEmail({
    to: input.email,
    subject: "New sign-in to your Furnishes account",
    text: `A new device signed in to your Furnishes account.\n\nWhere: ${where}\nBrowser: ${agent}\n\nIf this was not you, reset your password and sign out other sessions from Settings.`,
  });
}

export async function signup(input: {
  email: string;
  password: string;
  displayName?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<
  ServiceResult<
    { userId: string },
    "validation" | "rate_limited" | "email_taken"
  >
> {
  const windowMs = authRateLimitWindowMs();
  const max = authSignupMaxAttempts();
  const rate = await consumeRateLimit(
    ipKey("signup", input.ipAddress),
    max,
    windowMs,
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const emailParsed = emailSchema.safeParse(input.email);
  const passwordParsed = passwordSchema.safeParse(input.password);
  const fieldErrors: Record<string, string> = {};
  if (!emailParsed.success) {
    fieldErrors.email = "Enter a valid email address.";
  }
  if (!passwordParsed.success) {
    fieldErrors.password =
      passwordParsed.error.issues[0]?.message ?? "Invalid password.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return err("validation", "Check the highlighted fields.", fieldErrors);
  }

  const email = emailParsed.data!.toLowerCase();
  const accountRate = await consumeRateLimit(
    accountKey("signup", email),
    max,
    windowMs,
  );
  if (!accountRate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && !existing.deletedAt) {
    return err("email_taken", "An account with that email already exists.", {
      email: "An account with that email already exists.",
    });
  }

  const passwordHash = await hashPassword(passwordParsed.data!);
  const displayName =
    input.displayName?.trim() || email.split("@")[0] || "Member";

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          displayName,
          deletedAt: null,
          emailVerifiedAt: null,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          styleProfile: { create: { displayName, styleWords: "" } },
          budget: { create: { currency: "SGD" } },
          notificationPrefs: { create: {} },
        },
      });

  const raw = createRandomToken(32);
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      purpose: "verify_email",
      tokenDigest: digestToken(raw),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const verifyUrl = `${appOrigin()}${routes.verifyEmail}?token=${encodeURIComponent(raw)}`;
  await sendEmail({
    to: email,
    subject: "Verify your Furnishes email",
    text: `Verify your email: ${verifyUrl}`,
  });

  const session = await createSession({
    userId: user.id,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });
  await setSessionCookie(session.token, session.expiresAt);
  await recordSecurityEvent({
    userId: user.id,
    kind: "signup",
    ipAddress: input.ipAddress,
  });

  return ok({ userId: user.id });
}

export async function login(input: {
  email: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<
  ServiceResult<
    { userId: string },
    "auth_failed" | "rate_limited" | "validation"
  >
> {
  const windowMs = authRateLimitWindowMs();
  const max = authLoginMaxAttempts();
  const rate = await consumeRateLimit(
    ipKey("login", input.ipAddress),
    max,
    windowMs,
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const emailParsed = emailSchema.safeParse(input.email);
  const passwordParsed = z.string().min(1).max(200).safeParse(input.password);
  if (!emailParsed.success || !passwordParsed.success) {
    return err("validation", GENERIC_AUTH_ERROR);
  }

  const email = emailParsed.data.toLowerCase();
  const accountRate = await consumeRateLimit(
    accountKey("login", email),
    max,
    windowMs,
  );
  if (!accountRate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid =
    user &&
    !user.deletedAt &&
    (await verifyPassword(passwordParsed.data, user.passwordHash));

  if (!valid || !user) {
    await recordSecurityEvent({
      userId: user?.id,
      kind: "login_failure",
      ipAddress: input.ipAddress,
    });
    return err("auth_failed", GENERIC_AUTH_ERROR);
  }

  const session = await createSession({
    userId: user.id,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });
  await setSessionCookie(session.token, session.expiresAt);
  await recordSecurityEvent({
    userId: user.id,
    kind: "login_success",
    ipAddress: input.ipAddress,
  });
  await maybeSendLoginAlert({
    userId: user.id,
    email: user.email,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });

  return ok({ userId: user.id });
}

export async function logout(
  sessionId: string,
  userId?: string | null,
): Promise<void> {
  await revokeSession(sessionId);
  await clearSessionCookie();
  await recordSecurityEvent({
    userId: userId ?? null,
    kind: "logout",
  });
}

export async function requestPasswordReset(input: {
  email: string;
  ipAddress?: string | null;
}): Promise<ServiceResult<{ sent: true }, "rate_limited" | "validation">> {
  const windowMs = authRateLimitWindowMs();
  const max = authForgotMaxAttempts();
  const rate = await consumeRateLimit(
    ipKey("forgot", input.ipAddress),
    max,
    windowMs,
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const emailParsed = emailSchema.safeParse(input.email);
  if (!emailParsed.success) {
    // Enumeration-resistant: still return success-shaped messaging via caller.
    return ok({ sent: true });
  }

  const email = emailParsed.data.toLowerCase();
  const accountRate = await consumeRateLimit(
    accountKey("forgot", email),
    max,
    windowMs,
  );
  if (!accountRate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.deletedAt) {
    const raw = createRandomToken(32);
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        purpose: "reset_password",
        tokenDigest: digestToken(raw),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });
    const resetUrl = `${appOrigin()}${routes.resetPassword}?token=${encodeURIComponent(raw)}`;
    await sendEmail({
      to: email,
      subject: "Reset your Furnishes password",
      text: `Reset your password: ${resetUrl}`,
    });
    await recordSecurityEvent({
      userId: user.id,
      kind: "password_reset_requested",
      ipAddress: input.ipAddress,
    });
  }

  return ok({ sent: true });
}

export async function resetPassword(input: {
  token: string;
  password: string;
  ipAddress?: string | null;
}): Promise<
  ServiceResult<
    { userId: string },
    "invalid_token" | "validation" | "rate_limited"
  >
> {
  const rate = await consumeRateLimit(
    ipKey("reset", input.ipAddress),
    authResetMaxAttempts(),
    authRateLimitWindowMs(),
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const passwordParsed = passwordSchema.safeParse(input.password);
  if (!passwordParsed.success) {
    return err("validation", "Check the highlighted fields.", {
      password: passwordParsed.error.issues[0]?.message ?? "Invalid password.",
    });
  }

  const token = await prisma.emailToken.findUnique({
    where: { tokenDigest: digestToken(input.token) },
  });

  if (
    !token ||
    token.purpose !== "reset_password" ||
    token.usedAt ||
    token.expiresAt.getTime() <= Date.now()
  ) {
    return err("invalid_token", "This reset link is invalid or expired.");
  }

  const passwordHash = await hashPassword(passwordParsed.data);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash },
    }),
    prisma.emailToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await revokeAllSessions(token.userId);
  await recordSecurityEvent({
    userId: token.userId,
    kind: "password_reset_completed",
    ipAddress: input.ipAddress,
  });

  return ok({ userId: token.userId });
}

export async function changePassword(input: {
  userId: string;
  currentSessionId: string;
  currentPassword: string;
  newPassword: string;
  ipAddress?: string | null;
}): Promise<
  ServiceResult<
    { changed: true },
    "auth_failed" | "validation" | "rate_limited"
  >
> {
  const rate = await consumeRateLimit(
    `password_change:${input.userId}`,
    authLoginMaxAttempts(),
    authRateLimitWindowMs(),
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const currentParsed = z
    .string()
    .min(1)
    .max(200)
    .safeParse(input.currentPassword);
  const newParsed = passwordSchema.safeParse(input.newPassword);
  const fieldErrors: Record<string, string> = {};
  if (!currentParsed.success) {
    fieldErrors.currentPassword = "Enter your current password.";
  }
  if (!newParsed.success) {
    fieldErrors.newPassword =
      newParsed.error.issues[0]?.message ?? "Invalid password.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return err("validation", "Check the highlighted fields.", fieldErrors);
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.deletedAt) {
    return err("auth_failed", "Current password is incorrect.");
  }

  const valid = await verifyPassword(currentParsed.data!, user.passwordHash);
  if (!valid) {
    await recordSecurityEvent({
      userId: user.id,
      kind: "password_change_failure",
      ipAddress: input.ipAddress,
    });
    return err("auth_failed", "Current password is incorrect.", {
      currentPassword: "Current password is incorrect.",
    });
  }

  if (currentParsed.data === newParsed.data) {
    return err("validation", "Check the highlighted fields.", {
      newPassword: "Choose a password that is different from your current one.",
    });
  }

  const passwordHash = await hashPassword(newParsed.data!);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  await revokeOtherSessions(user.id, input.currentSessionId);
  await recordSecurityEvent({
    userId: user.id,
    kind: "password_changed",
    ipAddress: input.ipAddress,
  });

  return ok({ changed: true });
}

export async function verifyEmail(input: {
  token: string;
  ipAddress?: string | null;
}): Promise<
  ServiceResult<{ userId: string }, "invalid_token" | "rate_limited">
> {
  const rate = await consumeRateLimit(
    ipKey("verify", input.ipAddress),
    authVerifyMaxAttempts(),
    authRateLimitWindowMs(),
  );
  if (!rate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const token = await prisma.emailToken.findUnique({
    where: { tokenDigest: digestToken(input.token) },
  });

  if (
    !token ||
    token.purpose !== "verify_email" ||
    token.usedAt ||
    token.expiresAt.getTime() <= Date.now()
  ) {
    return err(
      "invalid_token",
      "This verification link is invalid or expired.",
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);
  await recordSecurityEvent({
    userId: token.userId,
    kind: "email_verified",
  });

  return ok({ userId: token.userId });
}

export async function resendVerification(input: {
  userId: string;
  email: string;
  ipAddress?: string | null;
}): Promise<ServiceResult<{ sent: true }, "rate_limited">> {
  const windowMs = authRateLimitWindowMs();
  const max = authResendVerifyMaxAttempts();
  const ipRate = await consumeRateLimit(
    ipKey("resend_verify", input.ipAddress),
    max,
    windowMs,
  );
  if (!ipRate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }
  const userRate = await consumeRateLimit(
    `resend_verify:user:${input.userId}`,
    max,
    windowMs,
  );
  if (!userRate.allowed) {
    return err("rate_limited", "Too many attempts. Try again later.");
  }

  const raw = createRandomToken(32);
  await prisma.emailToken.create({
    data: {
      userId: input.userId,
      purpose: "verify_email",
      tokenDigest: digestToken(raw),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });
  const verifyUrl = `${appOrigin()}${routes.verifyEmail}?token=${encodeURIComponent(raw)}`;
  await sendEmail({
    to: input.email,
    subject: "Verify your Furnishes email",
    text: `Verify your email: ${verifyUrl}`,
  });
  await recordSecurityEvent({
    userId: input.userId,
    kind: "verification_resent",
    ipAddress: input.ipAddress,
  });
  return ok({ sent: true });
}

export const authCopy = {
  GENERIC_AUTH_ERROR,
  GENERIC_RECOVERY,
  GENERIC_VERIFY,
} as const;
