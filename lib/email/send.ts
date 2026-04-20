/**
 * Email sending adapter.
 *
 * Wraps Resend's SDK with:
 *   - Dev fallback to console.log (no API key needed for local work)
 *   - Per-email type-safe templates
 *   - Sentry capture on send failures
 *   - From-address default + override
 *
 * INSTALL:
 *   npm install resend
 *
 * USAGE:
 *   await sendPasswordResetEmail({
 *     to: "user@example.com",
 *     resetUrl: "https://furnishes.sg/login/reset/abc123",
 *   });
 */

import "server-only";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "Furnishes <no-reply@furnishes.sg>";
const isProd = process.env.NODE_ENV === "production";

/* ── Lazy SDK init ────────────────────────────────────────── */

let resendInstance: {
  emails: { send: (args: SendArgs) => Promise<unknown> };
} | null = null;

type SendArgs = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

async function getResend() {
  if (resendInstance) return resendInstance;
  if (!RESEND_API_KEY) return null;
  const { Resend } = await import("resend");
  resendInstance = new Resend(RESEND_API_KEY);
  return resendInstance;
}

/* ── Generic send ─────────────────────────────────────────── */

type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  // No API key → log to console (dev/CI).
  // In prod, this branch should never run — we'd want a hard failure
  // instead, since silent email loss is dangerous.
  if (!RESEND_API_KEY) {
    if (isProd) {
      // Forward to Sentry so we KNOW about it
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureMessage(
          `RESEND_API_KEY missing — email to ${args.to} not sent`,
          "error",
        );
      } catch {
        // ignore
      }
      return {
        ok: false,
        error: "Email service not configured. Check RESEND_API_KEY env var.",
      };
    }
    console.log(
      `[email/dev] To: ${args.to}\n` +
        `  Subject: ${args.subject}\n` +
        `  Body preview: ${args.text?.slice(0, 200) ?? args.html.slice(0, 200).replace(/<[^>]+>/g, "")}`,
    );
    return { ok: true, id: `dev-${Date.now()}` };
  }

  try {
    const resend = await getResend();
    if (!resend) {
      return { ok: false, error: "Resend SDK failed to initialize." };
    }
    const result = (await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.text && { text: args.text }),
      ...(args.replyTo && { replyTo: args.replyTo }),
    })) as { id?: string; data?: { id: string } };
    const id = result.id ?? result.data?.id ?? "unknown";
    return { ok: true, id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Forward to Sentry — email failures are important to know about
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(e, { tags: { module: "email" } });
    } catch {
      // ignore
    }
    return { ok: false, error: message };
  }
}

/* ── Templates ────────────────────────────────────────────── */

/**
 * Password reset email — sent when a user requests a reset.
 * Token expires in 30 minutes (matches /api/auth/forgot logic).
 */
export async function sendPasswordResetEmail(args: {
  to: string;
  name?: string | null;
  resetUrl: string;
}): Promise<SendResult> {
  const greeting = args.name ? `Hi ${args.name},` : "Hi there,";
  const html = renderEmailLayout({
    preheader: "Reset your Furnishes password",
    body: `
      <p style="margin: 0 0 16px;">${greeting}</p>
      <p style="margin: 0 0 16px;">
        We received a request to reset your Furnishes password.
        Click the button below to choose a new one.
      </p>
      ${renderButton({ url: args.resetUrl, label: "Reset password" })}
      <p style="margin: 24px 0 8px; color: #7A5B42; font-size: 13px;">
        This link expires in 30 minutes. If you didn't request this,
        you can safely ignore this email — your password won't change.
      </p>
      <p style="margin: 16px 0 0; color: #7A5B42; font-size: 12px;">
        Trouble with the button? Paste this URL into your browser:<br>
        <span style="color: #2B1F18; word-break: break-all;">${args.resetUrl}</span>
      </p>
    `,
  });
  return sendEmail({
    to: args.to,
    subject: "Reset your Furnishes password",
    html,
    text: `${greeting}\n\nReset your Furnishes password: ${args.resetUrl}\n\nThis link expires in 30 minutes.`,
  });
}

/**
 * Email verification — sent on signup.
 * Token expires in 24 hours.
 */
export async function sendVerificationEmail(args: {
  to: string;
  name?: string | null;
  verifyUrl: string;
}): Promise<SendResult> {
  const greeting = args.name
    ? `Welcome to Furnishes, ${args.name}.`
    : "Welcome to Furnishes.";
  const html = renderEmailLayout({
    preheader: "Confirm your email to finish setting up",
    body: `
      <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 600;">${greeting}</h2>
      <p style="margin: 0 0 16px;">
        Confirm your email so we can send you order updates, password
        recoveries, and the occasional design idea (only if you opt in).
      </p>
      ${renderButton({ url: args.verifyUrl, label: "Confirm email" })}
      <p style="margin: 24px 0 8px; color: #7A5B42; font-size: 13px;">
        Link expires in 24 hours.
      </p>
    `,
  });
  return sendEmail({
    to: args.to,
    subject: "Confirm your email — Furnishes",
    html,
    text: `${greeting}\n\nConfirm your email: ${args.verifyUrl}`,
  });
}

/**
 * Support reply notification — sent when a Furnishes staff member replies
 * to a user's support thread.
 */
export async function sendSupportReplyEmail(args: {
  to: string;
  name?: string | null;
  ticketNumber: string;
  ticketTitle: string;
  staffName: string;
  replyExcerpt: string;
  threadUrl: string;
}): Promise<SendResult> {
  const greeting = args.name ? `Hi ${args.name},` : "Hi there,";
  const html = renderEmailLayout({
    preheader: `${args.staffName} replied to ${args.ticketNumber}`,
    body: `
      <p style="margin: 0 0 16px;">${greeting}</p>
      <p style="margin: 0 0 16px;">
        ${args.staffName} replied to your support thread
        <strong>${args.ticketNumber}</strong>: <em>${args.ticketTitle}</em>
      </p>
      <blockquote style="margin: 0 0 24px; padding: 12px 16px; background: #FBF5ED; border-left: 3px solid #f24a12; color: #2B1F18; font-style: italic;">
        ${args.replyExcerpt.replace(/\n/g, "<br>")}
      </blockquote>
      ${renderButton({ url: args.threadUrl, label: "View thread" })}
    `,
  });
  return sendEmail({
    to: args.to,
    subject: `Re: ${args.ticketTitle} [${args.ticketNumber}]`,
    html,
    text: `${greeting}\n\n${args.staffName} replied to ${args.ticketNumber}:\n\n${args.replyExcerpt}\n\nView: ${args.threadUrl}`,
  });
}

/**
 * Order confirmation — sent when checkout completes.
 */
export async function sendOrderConfirmationEmail(args: {
  to: string;
  name?: string | null;
  orderNumber: string;
  totalDisplay: string;
  orderUrl: string;
}): Promise<SendResult> {
  const greeting = args.name ? `Hi ${args.name},` : "Hi there,";
  const html = renderEmailLayout({
    preheader: `Order ${args.orderNumber} confirmed`,
    body: `
      <p style="margin: 0 0 16px;">${greeting}</p>
      <p style="margin: 0 0 16px;">
        Your order is in. We'll share a delivery window within 1 business day.
      </p>
      <p style="margin: 16px 0; font-size: 18px;">
        <strong>Order ${args.orderNumber}</strong> · Total: <strong>${args.totalDisplay}</strong>
      </p>
      ${renderButton({ url: args.orderUrl, label: "View order" })}
    `,
  });
  return sendEmail({
    to: args.to,
    subject: `Order confirmed — ${args.orderNumber}`,
    html,
    text: `${greeting}\n\nOrder ${args.orderNumber} confirmed.\nTotal: ${args.totalDisplay}\n\nView: ${args.orderUrl}`,
  });
}

/* ── HTML helpers ─────────────────────────────────────────── */

/**
 * Wraps body content in our editorial email layout.
 * Inline styles only — most email clients strip <style> tags.
 */
function renderEmailLayout({
  preheader,
  body,
}: {
  preheader: string;
  body: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Furnishes</title>
</head>
<body style="margin: 0; padding: 0; background: #FDF5EC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2B1F18; line-height: 1.6;">
  <span style="display: none; max-height: 0; overflow: hidden;">${preheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #FDF5EC;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: #FEFDFB; border: 1px solid rgba(43,31,24,0.08);">
          <tr>
            <td style="padding: 28px 32px 20px; border-bottom: 1px solid rgba(43,31,24,0.08);">
              <span style="font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #2B1F18; font-weight: 500;">
                FURNISHES <span style="color: #f24a12;">|</span> <span style="color: #7A5B42;">INTERIOR SOLUTION</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px; font-size: 14px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid rgba(43,31,24,0.08); font-size: 11px; color: #7A5B42;">
              You received this because you have a Furnishes account.<br>
              Furnishes Pte Ltd · Singapore · <a href="https://furnishes.sg/privacy-policy" style="color: #7A5B42;">Privacy</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function renderButton({ url, label }: { url: string; label: string }): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td>
      <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #f24a12; color: #FFFFFF; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; text-decoration: none;">
        ${label}
      </a>
    </td>
  </tr>
</table>`.trim();
}
