import nodemailer from "nodemailer";

type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
};

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@furnishes.local"
  );
}

/**
 * Email adapter. Logs when SMTP is unset (local/dev).
 * When SMTP_HOST is set, sends via nodemailer (production path).
 */
export async function sendEmail(
  message: OutboundEmail,
): Promise<{ delivered: boolean; mode: "smtp" | "log" }> {
  if (!smtpConfigured()) {
    console.info("[email:log]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return { delivered: true, mode: "log" };
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure =
    process.env.SMTP_SECURE === "1" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth:
      process.env.SMTP_USER?.trim() && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER.trim(),
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: fromAddress(),
    to: message.to,
    subject: message.subject,
    text: message.text,
  });

  return { delivered: true, mode: "smtp" };
}
